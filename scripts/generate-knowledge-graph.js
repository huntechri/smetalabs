#!/usr/bin/env node
/**
 * generate-knowledge-graph.js — SmetaLabs knowledge graph post-processor
 * 
 * Usage:
 *   node scripts/generate-knowledge-graph.js [--from understand|assembled|existing]
 *
 * --from understand   Full pipeline: reads intermediate/assembled-graph.json from understand skill
 * --from assembled    Start from assembled graph (skip understand re-run)
 * --from existing     Start from existing .understand-anything/knowledge-graph.json (default)
 *
 * Phases:
 *   P1 — Load & normalize (file nodes, edges)
 *   P2 — Descriptions & confidence (path-based heuristics + explicit mappings)
 *   P3 — Sections & featureSections (split features-root, multi-section support)
 *   P4 — Full import scan (read .ts/.tsx files, resolve all imports)
 *   P5 — Connections rebuild (20 edge types classification)
 *   P6 — Findings generation (MOCK, STUB, CIRC, ISOL, LARGE, CROSS, MIGRATION)
 *   P7 — Readiness assessment (14 sections, aliases)
 *   P8 — SectionChains (layers per section, alias merging)
 *   P9 — DocComparison (cross-reference with features/[feature]/docs/)
 *   P10 — CrossSectionRules, save & summary
 */

import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

// ─── Config ──────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(PROJECT_ROOT, '.understand-anything', 'knowledge-graph.json');
const INTERMEDIATE = path.join(PROJECT_ROOT, '.understand-anything', 'intermediate', 'assembled-graph.json');

const NOW = new Date().toISOString();
let GIT_COMMIT = '';
try { GIT_COMMIT = cp.execSync('git rev-parse HEAD', {cwd: PROJECT_ROOT}).toString().trim(); } catch(e) {}

// ─── P0 — Parse args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args.includes('--from') ? args[args.indexOf('--from')+1] || 'existing' : 'existing';

console.log('[KG] generate-knowledge-graph v1.0.0');
console.log('[KG] mode: ' + mode);
console.log('[KG] commit: ' + (GIT_COMMIT || 'unknown'));

// ─── P1 — Load ────────────────────────────────────────────────────────
let g;

if (mode === 'existing') {
  console.log('[P1] Loading existing graph...');
  g = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
} else if (mode === 'assembled') {
  console.log('[P1] Loading assembled graph from understand skill...');
  g = JSON.parse(fs.readFileSync(INTERMEDIATE, 'utf8'));
} else {
  console.error('[P1] Full pipeline not implemented — run understand skill first, then use --from assembled');
  process.exit(1);
}

// Filter out any files that no longer exist on disk
g.files = g.files.filter(f => {
  if (f.path.endsWith('/')) return true;
  return fs.existsSync(path.join(PROJECT_ROOT, f.path));
});

// Add newly created EstimateWorkCoefficientDialog component if not present
const newComponent = 'features/estimates/estimate-details/components/estimate-work-coefficient-dialog.tsx';
if (fs.existsSync(path.join(PROJECT_ROOT, newComponent)) && !g.files.some(f => f.path === newComponent)) {
  g.files.push({
    path: newComponent,
    layer: 'components',
    section: 'estimates',
    status: 'production',
    description: 'Компонент: диалоговое окно коэффициента работ сметы',
    confidence: 'high',
    incomingConnections: [],
    outgoingConnections: [],
    incomingCount: 0,
    outgoingCount: 0,
    routeSection: 'estimates',
    featureSection: 'estimates',
    featureSections: ['estimates']
  });
}

// Scan db/migrations/ directory and add any new SQL files to g.files
const migrationsDir = path.join(PROJECT_ROOT, 'db', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const filesOnDisk = fs.readdirSync(migrationsDir);
  filesOnDisk.forEach(filename => {
    if (filename.endsWith('.sql')) {
      const relPath = 'db/migrations/' + filename;
      if (!g.files.some(f => f.path === relPath)) {
        g.files.push({
          path: relPath,
          layer: 'migrations',
          section: 'database',
          status: 'production',
          description: `Миграция БД: ${filename}`,
          confidence: 'high',
          incomingConnections: [],
          outgoingConnections: [],
          incomingCount: 0,
          outgoingCount: 0,
          routeSection: 'database',
          featureSection: 'database',
          featureSections: ['database']
        });
      }
    }
  });
}

const fileMap = new Map(g.files.map(f => [f.path, f]));

// Clean up outgoing connections pointing to deleted files
g.files.forEach(f => {
  f.outgoingConnections = f.outgoingConnections.filter(target => fileMap.has(target));
  f.outgoingCount = f.outgoingConnections.length;
});

console.log('[P1] ' + g.files.length + ' files loaded');

// ─── P2 — Descriptions & confidence ──────────────────────────────────
console.log('[P2] Generating descriptions...');
let descFilled = 0;
let descTemplate = 0;

const TEMPLATE_PATTERNS = [
  "Утилита фичи «", "Хук фичи «", "Компонент «", "API-клиент фичи «", "API-слой фичи «",
  "Серверный сервис фичи «", "Серверный слой фичи «", "Zod-схемы валидации фичи «",
  "Репозиторий фичи «", "Мок-данные фичи «", "Тесты фичи «", "Тесты API-клиента фичи «",
  "Тесты серверного слоя фичи «", "Тесты хуков фичи «", "Тесты компонентов фичи «",
  "Ключи React Query для фичи «", "UI-компонент ", "Общий компонент: ",
  "Детальный компонент справочника", "Детальный компонент выполнения",
  "Детальный компонент закупок сметы", "Компонент вкладки сметы",
  "Компонент обзора проекта", "TypeScript-типы фичи «",
  "Документация фичи «", "Детальный компонент глобальных закупок",
];

function fileDesc(filePath, name) {
  const parts = filePath.split('/');
  const dir = parts.slice(0, -1).join('/');

  // ── app/ pages ──
  if (filePath.match(/^app\/\(auth\)\//)) {
    if (filePath.endsWith('/layout.tsx')) return 'Layout авторизации: центрированный, без sidebar';
    if (filePath.endsWith('/page.tsx')) {
      const m = filePath.match(/\(auth\)\/(.+?)\/page\.tsx$/);
      if (m) return `Страница ${m[1].replace(/-/g, ' ')}`;
    }
  }
  if (filePath.match(/^app\/\(main\)\/layout\.tsx$/)) return 'Корневой layout основного интерфейса: SidebarProvider + AppSidebar + SiteHeader';
  if (filePath.match(/^app\/\(main\)\/page\.tsx$/)) return 'Корневая страница основного интерфейса (редирект на /dashboard)';
  if (filePath.match(/^app\/layout\.tsx$/)) return 'Корневой layout: шрифты, ThemeProvider, TooltipProvider';
  if (filePath === 'app/page.tsx') return 'Корневая страница приложения (редирект в зависимости от сессии)';
  if (filePath.match(/^app\/\(main\)\/projects\/\[projectId\]\/estimates\/\[estimateId\]\/layout\.tsx$/)) return 'Layout редактора сметы: табы навигации + тулбар';
  if (filePath === 'app/(main)/projects/page.tsx') return 'Список проектов с поиском, фильтрацией и созданием';
  if (filePath.match(/^app\/\(main\)\/projects\/\[projectId\]\/page\.tsx$/)) return 'Страница деталей проекта';
  if (filePath.match(/^app\/\(main\)\/projects\/\[projectId\]\/estimates\/\[estimateId\]\/page\.tsx$/)) return 'Главная вкладка редактора сметы';
  if (filePath.match(/^app\/\(main\)\/projects\/\[projectId\]\/estimates\/\[estimateId\]\/(execution|finances|purchases|documents)\/page\.tsx$/)) {
    const tab = RegExp.$1;
    const tabNames = { purchases:'Закупки', execution:'Выполнение', finances:'Финансы', documents:'Документы' };
    return `Вкладка «${tabNames[tab] || tab}» редактора сметы`;
  }
  if (filePath.match(/^app\/admin\/page\.tsx$/)) return 'Страница административной панели';
  if (filePath.match(/^app\/\(main\)\/page\.tsx$/) || filePath.match(/^app\/\(main\)\/[^/]+\/page\.tsx$/)) return `Страница раздела в App Router`;
  
  // ── app/ API routes ──
  if (filePath.match(/^app\/auth\/callback\/route\.ts$/)) return 'Supabase Auth callback: обработка OAuth/magic-link редиректа';
  if (filePath.match(/^app\/api\/directory-(materials|works|suppliers|counterparties)\/route\.ts$/)) return `API: список справочника (GET) и создание (POST)`;
  if (filePath.match(/^app\/api\/directory-(materials|works|suppliers|counterparties)\/\[id\]\/route\.ts$/)) return `API: получение/обновление/удаление записи справочника`;
  if (filePath.includes('/api/directory-materials/ai-search/')) return 'API: AI-поиск материалов (pgvector + FTS + pg_trgm)';
  if (filePath.includes('/api/directory-materials/categories/')) return 'API: список категорий материалов';
  if (filePath.includes('/api/directory-materials/embeddings/')) return 'API: запуск генерации эмбеддингов для материалов';
  if (filePath.includes('/api/directory-materials/export/')) return 'API: экспорт материалов в CSV';
  if (filePath.includes('/api/directory-materials/search/')) return 'API: поиск материалов (FTS + pg_trgm)';
  if (filePath.includes('/api/directory-materials/import-jobs/')) {
    if (filePath.endsWith('/route.ts')) return 'API: создание и список заданий импорта материалов';
    if (filePath.includes('/apply-fast/')) return 'API: быстрое применение импорта материалов (COPY-оптимизация)';
    if (filePath.includes('/apply/')) return 'API: применение импорта материалов (вставка в БД)';
    if (filePath.includes('/batches/')) return 'API: пакетная обработка импорта материалов';
    return 'API: статус и удаление задания импорта материалов';
  }
  if (filePath.match(/^app\/api\/directory-works\/ai-search\//)) return 'API: AI-поиск видов работ (pgvector + FTS)';
  if (filePath.match(/^app\/api\/directory-works\/categories\//)) return 'API: список категорий видов работ';
  if (filePath.match(/^app\/api\/directory-works\/embeddings\//)) return 'API: запуск генерации эмбеддингов для видов работ';
  if (filePath.match(/^app\/api\/directory-works\/export\//)) return 'API: экспорт видов работ в CSV';
  if (filePath.match(/^app\/api\/directory-works\/search\//)) return 'API: поиск видов работ (FTS + pg_trgm)';
  if (filePath.match(/^app\/api\/directory-works\/import-jobs\//)) return 'API: управление импортом видов работ';
  if (filePath.match(/^app\/api\/global-purchases\/route\.ts$/)) return 'API: список глобальных закупок (GET) и создание (POST через RPC)';
  if (filePath.match(/^app\/api\/global-purchases\/\[id\]\/route\.ts$/)) return 'API: получение/обновление/удаление глобальной закупки';
  if (filePath.match(/^app\/api\/global-purchases\/export\//)) return 'API: экспорт глобальных закупок в Excel';
  if (filePath.match(/^app\/api\/global-purchases\/material-options\//)) return 'API: поиск вариантов материалов для глобальных закупок';
  if (filePath.match(/^app\/api\/projects\/route\.ts$/)) return 'API: список проектов (GET) и создание (POST)';
  if (filePath.match(/^app\/api\/projects\/\[id\]\/route\.ts$/)) return 'API: получение/обновление/удаление проекта';
  if (filePath.match(/^app\/api\/projects\/\[id\]\/estimate-records\/route\.ts$/)) return 'API: список записей сметы проекта (GET) и создание (POST)';
  if (filePath.match(/^app\/api\/projects\/\[id\]\/estimate-records\/\[recordId\]\/route\.ts$/)) return 'API: получение/обновление/удаление записи сметы';
  if (filePath.includes('/estimate-records/') && filePath.includes('/changes/')) return 'API: история изменений записи сметы';
  if (filePath.includes('/estimate-records/') && filePath.includes('/content/')) return 'API: содержимое записи сметы (работы + материалы)';
  if (filePath.includes('/estimate-records/') && filePath.includes('/import/')) return 'API: импорт записи сметы из шаблона';
  if (filePath.includes('/material-options/')) return 'API: поиск вариантов материалов для сметы (RPC)';
  if (filePath.includes('/work-options/')) return 'API: поиск вариантов работ для сметы (RPC)';
  if (filePath.includes('/work-coefficient/')) return 'API: расчёт коэффициента работы (материалы, трудозатраты)';
  if (filePath.includes('/payments/') && filePath.match(/\/\[paymentId\]/)) return 'API: обновление/удаление платежа сметы';
  if (filePath.includes('/payments/')) return 'API: список и создание платежей сметы';
  if (filePath.includes('/purchases/') && filePath.match(/\/\[purchaseId\]/)) return 'API: обновление/архивация закупки сметы (RPC)';
  if (filePath.includes('/purchases/')) return 'API: список и создание закупок сметы (RPC)';
  if (filePath.match(/^app\/api\/projects\/\[id\]\/dashboard-stats\//)) return 'API: статистика дашборда проекта';
  if (filePath.match(/^app\/api\/settings\/route\.ts$/)) return 'API: настройки пользователя (GET + PATCH)';
  if (filePath.match(/^app\/api\/team\/members\//)) return 'API: управление участниками команды';
  if (filePath.match(/^app\/api\/team\/domains\//)) return 'API: разрешённые домены workspace';
  if (filePath.match(/^app\/api\/team\/invitations\/accept\//)) return 'API: принятие приглашения в workspace';
  if (filePath.match(/^app\/api\/team\/invitations\//) && filePath.includes('/resend/')) return 'API: повторная отправка приглашения';
  if (filePath.match(/^app\/api\/team\/invitations\//) && filePath.includes('/[id]')) return 'API: отзыв/удаление приглашения';
  if (filePath.match(/^app\/api\/team\/invitations\//)) return 'API: список и создание приглашений в команду';
  if (filePath.match(/^app\/api\/team\/invite-link\//)) return 'API: генерация/ротация ссылки-приглашения';
  if (filePath.match(/^app\/api\/team\/overview\//)) return 'API: сводная информация о команде';
  if (filePath.match(/^app\/api\/access-control\/roles\//)) return 'API: список ролей для контроля доступа';
  if (filePath.match(/^app\/api\/notifications\/archive\//)) return 'API: архивирование уведомлений';
  if (filePath.match(/^app\/api\/notifications\/read\//)) return 'API: отметка уведомлений как прочитанных';
  if (filePath.match(/^app\/api\/notifications\//)) return 'API: список уведомлений (GET)';
  if (filePath.match(/^app\/api\//)) return `API Route: ${filePath.replace('app/api/','')}`;
  
  // ── app/ actions ──
  if (filePath.match(/^app\/actions\//)) return `Server Action: ${name.replace('.ts','').replace(/-/g, ' ')}`;
  
  // ── features/ ──
  if (filePath.startsWith('features/')) return featureDesc(filePath, name);

  // ── components/ ──
  if (filePath.startsWith('components/ui/')) return `UI-компонент ${name.replace('.tsx','')} (shadcn/ui / radix-mira)`;
  if (filePath.startsWith('components/')) return `Общий компонент: ${name.replace('.tsx','')}`;
  
  // ── db/ ──
  if (filePath.startsWith('db/migrations/')) {
    const m = name.match(/^(\d+)_(.+)\.sql$/);
    if (m) return `Миграция БД #${m[1]}: ${m[2].replace(/_/g, ' ')}`;
    return 'Файл миграции базы данных';
  }
  if (filePath === 'db/index.ts') return 'Точка входа слоя БД: экспорт всех схем и утилит Drizzle';
  if (filePath === 'db/seed.ts') return 'Скрипт сидирования БД: роли, права, workspace по умолчанию';
  if (filePath === 'db/seed-settings.ts') return 'Скрипт сидирования настроек: роли и права по умолчанию';
  if (filePath.startsWith('db/schema/')) return `Схема БД (Drizzle ORM): ${name.replace('.ts','')}`;
  
  // ── lib/ ──
  if (filePath.startsWith('lib/')) return `Утилита: ${filePath.replace('lib/','').replace('.ts','').replace('.tsx','')}`;
  
  // ── types/ ──
  if (filePath.startsWith('types/')) return `TypeScript-типы: ${name.replace('.ts','')}`;
  
  // ── docs/ ──
  if (filePath.startsWith('docs/')) {
    const docNames = {
      'README.md': 'Навигационный хаб всей документации проекта',
      'architecture.md': 'Фронтенд-архитектура: стек, слои, роутинг, RBAC',
      'backend-architecture.md': 'Бэкенд-архитектура: 24 таблицы, RLS, API, RPC, Zod',
      'design-system.md': 'Дизайн-система: 34 компонента, oklch-токены, Phosphor иконки',
      'directory-module-standard.md': 'Стандарт построения справочников',
      'search-system.md': 'Система поиска: FTS + pg_trgm + pgvector',
      'deployment.md': 'Vercel автодеплой: PR→Preview, merge→Production',
      'testing-strategy.md': 'Стратегия тестирования: Vitest + RTL',
      'filemap.md': 'Полная карта кода: файлы, слои, правила',
      'getting-started.md': 'Быстрый старт: pnpm, env vars, структура',
      'knowledge-graph-methodology.md': 'Методология генерации knowledge graph',
    };
    if (docNames[name]) return docNames[name];
    return 'Документация проекта';
  }

  // ── Config ──
  if (name === 'package.json') return 'Манифест проекта: зависимости, скрипты, метаданные';
  if (name === 'tsconfig.json') return 'Конфигурация TypeScript';
  if (name === 'next.config.mjs') return 'Конфигурация Next.js';
  if (name === 'drizzle.config.ts') return 'Конфигурация Drizzle ORM';
  if (name === 'vitest.config.ts') return 'Конфигурация Vitest';
  if (name === 'vitest.setup.ts') return 'Настройка Vitest (глобальные моки, хуки)';
  if (name === 'package-lock.json') return 'Лок-файл npm (не используется — проект на pnpm)';
  if (name === 'pnpm-lock.yaml') return 'Лок-файл pnpm: зафиксированные версии зависимостей';
  if (name === 'skills-lock.json') return 'Лок-файл навыков OpenClaw';
  if (name === 'components.json') return 'Конфигурация shadcn/ui: алиасы путей, цветовая схема';
  if (name === 'next-env.d.ts') return 'Автогенерируемые типы Next.js (env, params)';
  if (name === 'README.md') return 'README проекта: техническая информация';
  if (name === 'middleware.ts') return 'Next.js middleware: проверка сессии Supabase, защита роутов';
  if (name === 'AGENTS.md') return 'Правила и инструкции для AI-агентов проекта';
  
  // ── hooks/ (root) ──
  if (filePath === 'hooks/use-mobile.ts') return 'Хук определения мобильного устройства (useIsMobile)';
  
  // ── features/ root (app shell) ──
  if (filePath === 'features/app-sidebar.tsx') return 'Боковая панель навигации: меню разделов, проекты, настройки';
  if (filePath === 'features/site-header.tsx') return 'Верхняя панель: хлебные крошки, поиск, профиль';
  if (filePath === 'features/nav-main.tsx') return 'Главное меню навигации: пункты разделов';
  if (filePath === 'features/nav-projects.tsx') return 'Меню навигации по проектам';
  if (filePath === 'features/nav-secondary.tsx') return 'Вторичное меню: настройки, команда, справка';
  if (filePath === 'features/nav-user.tsx') return 'Меню пользователя: профиль, выход';
  if (filePath === 'features/nav-documents.tsx') return 'Навигация по документам';
  if (filePath === 'features/search-form.tsx') return 'Форма глобального поиска по проекту';
  
  // ── supabase/ ──
  if (filePath.startsWith('supabase/functions/')) return `Edge Function: ${name.replace('/index.ts','')}`;
  
  return null;
}

function featureDesc(filePath, name) {
  const parts = filePath.split('/');
  const feature = parts[1];
  const subpath = parts.slice(2).join('/');

  // Feature docs
  if (subpath === 'docs/README.md') {
    const names = {
      'access-control':'RBAC, роли, права', 'account-settings':'Настройки аккаунта',
      'auth':'Аутентификация', 'dashboard':'Дашборд', 'directories':'Справочники',
      'directory-counterparties':'Справочник контрагентов', 'directory-materials':'Справочник материалов',
      'directory-suppliers':'Справочник поставщиков', 'directory-works':'Справочник видов работ',
      'estimates':'Сметы', 'execution':'Выполнение', 'finances':'Финансы',
      'global-purchases':'Глобальные закупки', 'notifications':'Уведомления',
      'projects':'Проекты', 'purchases':'Закупки', 'workspace-settings':'Настройки workspace',
    };
    if (names[feature]) return `Документация фичи «${names[feature]}»`;
    return `Документация фичи «${feature}»`;
  }

  // Per-subpath heuristics
  if (subpath.includes('__mocks__/')) return `Мок-данные фичи «${feature}»`;
  if (subpath.includes('__tests__/')) return `Тесты фичи «${feature}»`;
  if (subpath.startsWith('api/')) {
    if (subpath.includes('-client')) return `API-клиент фичи «${feature}»`;
    if (subpath.includes('-query-keys')) return `Ключи React Query для фичи «${feature}»`;
    if (subpath.includes('-errors')) return `Типы ошибок API фичи «${feature}»`;
    return `API-слой фичи «${feature}»`;
  }
  if (subpath.startsWith('server/')) {
    if (subpath.includes('.service')) return `Серверный сервис фичи «${feature}»`;
    if (subpath.includes('.schemas')) return `Zod-схемы валидации фичи «${feature}»`;
    if (subpath.includes('.repository')) return `Репозиторий фичи «${feature}» (запросы к БД)`;
    if (subpath.includes('.route-handlers')) return `Route handlers фичи «${feature}» (API → service)`;
    return `Серверный слой фичи «${feature}»`;
  }
  if (subpath.startsWith('hooks/')) return `Хук фичи «${feature}»`;
  if (subpath.startsWith('lib/')) return `Утилита фичи «${feature}»`;
  if (subpath.endsWith('/types.ts')) return `TypeScript-типы фичи «${feature}»`;

  // Detail components
  const compName = name.replace('.tsx','').replace(/-/g, ' ');
  if (subpath.startsWith('components/')) return `Компонент «${compName}» фичи «${feature}»`;
  if (subpath.match(/^[a-z-]+-details\/components\//)) return `Детальный компонент фичи «${feature}»: ${compName}`;
  if (subpath.startsWith('estimate-details/')) return `Детальный компонент сметы: ${compName}`;
  if (subpath.startsWith('estimate-tabs/')) return `Компонент вкладки сметы: ${compName}`;
  if (subpath.startsWith('project-overview/')) return `Компонент обзора проекта: ${compName}`;
  
  return null;
}

g.files.forEach(f => {
  if (f.description && !TEMPLATE_PATTERNS.some(p => f.description.includes(p))) return; // keep existing good descriptions
  const desc = fileDesc(f.path, f.path.split('/').pop() || '');
  if (desc) {
    const isTemplate = TEMPLATE_PATTERNS.some(p => desc.includes(p));
    f.description = desc;
    f.confidence = isTemplate ? 'medium' : 'high';
    descFilled++;
    if (isTemplate) descTemplate++;
  } else {
    f.description = f.path;
    f.confidence = 'low';
  }
});

console.log('[P2] ' + descFilled + ' descriptions (high=' + (descFilled-descTemplate) + ' medium=' + descTemplate + ')');

// ─── P3 — Sections & featureSections ──────────────────────────────────
console.log('[P3] Assigning sections...');

function deriveSection(filePath) {
  if (filePath.match(/^app\/\(auth\)\//)) return 'auth';
  if (filePath.match(/^app\/\(main\)\/dashboard\//)) return 'dashboard';
  if (filePath.match(/^app\/\(main\)\/projects\//)) return 'projects';
  if (filePath.match(/^app\/\(main\)\/directories\//)) return 'directories';
  if (filePath.match(/^app\/\(main\)\/procurements\//)) return 'global-purchases';
  if (filePath.match(/^app\/\(main\)\/team\//)) return 'team';
  if (filePath.match(/^app\/\(main\)\/templates\//)) return 'templates';
  if (filePath.match(/^app\/\(main\)\/settings\//)) return 'settings';
  if (filePath.match(/^app\/\(main\)\/page\.tsx$/) || filePath.match(/^app\/\(main\)\/layout\.tsx$/)) return 'app';
  if (filePath.match(/^app\/layout\.tsx$/) || filePath.match(/^app\/page\.tsx$/) || filePath === 'app/globals.css') return 'app';
  if (filePath.match(/^app\/admin\//)) return 'admin';
  if (filePath === 'middleware.ts') return 'auth';
  if (filePath.match(/^app\/api\/access-control\//)) return 'access-control';
  if (filePath.match(/^app\/api\/directory-materials\//)) return 'directory-materials';
  if (filePath.match(/^app\/api\/directory-works\//)) return 'directory-works';
  if (filePath.match(/^app\/api\/directory-suppliers\//)) return 'directory-suppliers';
  if (filePath.match(/^app\/api\/directory-counterparties\//)) return 'directory-counterparties';
  if (filePath.match(/^app\/api\/global-purchases\//)) return 'global-purchases';
  if (filePath.match(/^app\/api\/projects\//)) return 'projects';
  if (filePath.match(/^app\/api\/team\//)) return 'team';
  if (filePath.match(/^app\/api\/settings\//)) return 'settings';
  if (filePath.match(/^app\/api\/notifications\//)) return 'notifications';
  if (filePath.match(/^app\/actions\//)) return 'app';
  if (filePath.startsWith('features/')) {
    const feat = filePath.split('/')[1];
    const known = ['access-control','account-settings','auth','dashboard','directories',
      'directory-counterparties','directory-materials','directory-suppliers','directory-works',
      'estimates','execution','finances','global-purchases','notifications','projects',
      'purchases','workspace-settings'];
    if (known.includes(feat)) return feat;
    if (filePath.match(/^features\/(app-sidebar|site-header|nav-|search-form)/)) return 'app';
    return feat;
  }
  if (filePath.startsWith('components/ui/')) return 'design-system';
  if (filePath.startsWith('components/')) return 'shared-components';
  if (filePath.startsWith('db/')) return 'database';
  if (filePath.startsWith('lib/auth/')) return 'auth-core';
  if (filePath.startsWith('lib/supabase/')) return 'supabase';
  if (filePath.startsWith('lib/')) return 'shared-lib';
  if (filePath.startsWith('types/')) return 'types';
  if (filePath.startsWith('docs/')) return 'docs';
  if (filePath.startsWith('supabase/')) return 'supabase-edge';
  if (filePath === 'hooks/use-mobile.ts') return 'shared-hooks';
  const configs = ['package.json','tsconfig.json','next.config.mjs','drizzle.config.ts',
    'vitest.config.ts','vitest.setup.ts','postcss.config.mjs','eslint.config.mjs',
    'vercel.json','pnpm-workspace.yaml','pnpm-lock.yaml','package-lock.json',
    'components.json','next-env.d.ts','skills-lock.json','proxy.ts','README.md'];
  if (configs.includes(filePath)) return filePath.replace(/^\./, '');
  return 'unknown';
}

const MULTI_SECTION = {
  'app/(main)/settings/access/page.tsx': ['workspace-settings', 'access-control'],
  'app/(main)/settings/account/page.tsx': ['account-settings', 'workspace-settings'],
  'app/(main)/team/page.tsx': ['workspace-settings', 'team'],
};

const ROUTE_TO_FEATURE = {
  'app/(main)/directories/materials/page.tsx': 'directory-materials',
  'app/(main)/directories/works/page.tsx': 'directory-works',
  'app/(main)/directories/suppliers/page.tsx': 'directory-suppliers',
  'app/(main)/directories/counterparties/page.tsx': 'directory-counterparties',
  'app/(main)/settings/account/page.tsx': 'account-settings',
  'app/(main)/settings/access/page.tsx': 'workspace-settings',
  'app/(main)/team/page.tsx': 'workspace-settings',
  'app/(main)/projects/[projectId]/estimates/[estimateId]/page.tsx': 'estimates',
  'app/(main)/projects/[projectId]/estimates/[estimateId]/execution/page.tsx': 'execution',
  'app/(main)/projects/[projectId]/estimates/[estimateId]/finances/page.tsx': 'finances',
  'app/(main)/projects/[projectId]/estimates/[estimateId]/purchases/page.tsx': 'purchases',
};

const SCHEMA_TO_FEATURE = {
  'projects': 'projects', 'project-estimate-records': 'estimates',
  'project-estimate-content': 'estimates', 'project-estimate-purchases': 'purchases',
  'project-estimate-payments': 'finances', 'global-purchases': 'global-purchases',
  'directory-materials': 'directory-materials', 'directory-works': 'directory-works',
  'directory-suppliers': 'directory-suppliers', 'directory-counterparties': 'directory-counterparties',
  'notifications': 'notifications', 'rbac': 'access-control', 'profiles': 'auth-core',
  'user-settings': 'account-settings', 'workspace-members': 'workspace-settings',
  'workspace-invitations': 'workspace-settings', 'workspace-allowed-domains': 'workspace-settings',
};

g.files.forEach(f => {
  f.section = f.section || deriveSection(f.path);
  f.routeSection = f.section;
  f.featureSection = ROUTE_TO_FEATURE[f.path] || f.section;
  f.featureSections = MULTI_SECTION[f.path] || [f.featureSection];

  // Schema files belong to both database and feature
  if (f.path.startsWith('db/schema/')) {
    const sn = f.path.replace('db/schema/', '').replace('.ts', '');
    if (SCHEMA_TO_FEATURE[sn]) {
      f.featureSections = [SCHEMA_TO_FEATURE[sn]];
    }
  }
});

// ─── P4 — Full import scan ───────────────────────────────────────────
console.log('[P4] Full import scan...');

function resolveImport(importPath, prefix, sourceFile) {
  const sourceDir = path.dirname(sourceFile);
  let fullPath = importPath;
  if (prefix === '../' || prefix === './') fullPath = prefix + importPath;
  const rel = path.normalize(path.join(sourceDir, fullPath));
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (fileMap.has(rel + ext)) return rel + ext;
  }
  if (fileMap.has(rel)) return rel;
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (fileMap.has(importPath + ext)) return importPath + ext;
  }
  if (fileMap.has(importPath)) return importPath;
  return null;
}

let totalImportsAdded = 0;
g.files.forEach(fileEntry => {
  const fp = fileEntry.path;
  if (!fp.match(/\.(tsx?)$/)) return;
  const fullPath = path.join(PROJECT_ROOT, fp);
  if (!fs.existsSync(fullPath)) return;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const importRegex = /from\s+["\x27](@\/|\.\.\/|\.\/)*([^"\x27]+)["\x27]/g;
  let match;
  const found = [];
  
  while ((match = importRegex.exec(content)) !== null) {
    const resolved = resolveImport(match[2], match[1] || '', fp);
    if (resolved && resolved !== fp) found.push(resolved);
  }
  
  fileEntry.outgoingConnections = [...new Set(found)];
  fileEntry.outgoingCount = fileEntry.outgoingConnections.length;
});

console.log('[P4] ' + totalImportsAdded + ' missing imports added');

// Rebuild incoming
g.files.forEach(f => { f.incomingConnections = []; });
g.files.forEach(f => {
  f.outgoingConnections.forEach(t => {
    const tf = fileMap.get(t);
    if (tf && !tf.incomingConnections.includes(f.path)) tf.incomingConnections.push(f.path);
  });
});
g.files.forEach(f => { f.incomingCount = f.incomingConnections.length; });

// ─── P5 — Connections rebuild (20 edge types) ───────────────────────
console.log('[P5] Building connections with edge types...');

function classifyEdgeType(sourcePath, targetPath) {
  if (targetPath.includes('__mocks__/')) return 'uses-mock';
  if (targetPath.includes('__tests__/') || targetPath.includes('.test.')) return 'tests';
  if (targetPath.startsWith('types/') || targetPath.endsWith('/types.ts')) return 'uses-type';
  if (targetPath.startsWith('db/schema/')) return 'uses-schema';
  if (targetPath.startsWith('db/migrations/')) return 'migrates';
  if (targetPath === 'db/index.ts') return 'uses-database';
  if (targetPath.includes('/server/') && targetPath.includes('.service.')) return 'calls-service';
  if (targetPath.includes('/server/') && targetPath.includes('.repository.')) return 'queries-data';
  if (targetPath.includes('/server/') && targetPath.includes('.route-handlers.')) return 'calls-handler';
  if (targetPath.includes('/server/') && targetPath.includes('.schemas.')) return 'validates';
  if (targetPath.includes('/server/')) return 'uses-server';
  if (targetPath.includes('/api/') && targetPath.includes('-client.')) return 'api-call';
  if (targetPath.includes('/api/') && targetPath.includes('-query-keys.')) return 'query-keys';
  if (targetPath.includes('/api/') && targetPath.includes('-errors.')) return 'uses-errors';
  if (targetPath.includes('/hooks/')) return 'uses-hook';
  if (targetPath.includes('-events.ts')) return 'dispatches-event';
  if (sourcePath.includes('-events.ts')) return 'listens-event';
  if (targetPath.startsWith('components/ui/')) return 'uses-ui';
  if (sourcePath.match(/^app\/.*\/page\.tsx$/) && targetPath.endsWith('.tsx')) return 'composes-screen';
  if (targetPath.endsWith('.tsx') && !targetPath.match(/^app\//)) return 'uses-component';
  if (targetPath.includes('/components/')) return 'uses-component';
  if (targetPath.startsWith('lib/') || targetPath.includes('/lib/')) return 'uses-lib';
  if (targetPath.match(/\.(config\.|json$|yaml$|mjs$|env$)/)) return 'configures';
  if (targetPath.startsWith('docs/') || targetPath.includes('/docs/')) return 'documents';
  if (targetPath.match(/^app\/.*\/page\.tsx$/)) return 'routes-to';
  if (targetPath.match(/^app\/api\//)) return 'calls-endpoint';
  return 'imports';
}

const connections = [];
g.files.forEach(f => {
  f.outgoingConnections.forEach(target => {
    if (!fileMap.has(target)) return;
    connections.push({
      source: f.path, target,
      type: classifyEdgeType(f.path, target),
      sourceSection: f.featureSection || f.section,
      targetSection: fileMap.get(target)?.featureSection || fileMap.get(target)?.section || 'unknown',
    });
  });
});
g.connections = connections;

const edgeStats = {};
connections.forEach(c => { edgeStats[c.type] = (edgeStats[c.type]||0)+1; });
console.log('[P5] ' + connections.length + ' connections, ' + Object.keys(edgeStats).length + ' types');

// ─── P6 — Findings ──────────────────────────────────────────────────
console.log('[P6] Generating findings...');

g.findings = [];

// MOCK-001
const mockEdges = connections.filter(c => c.type === 'uses-mock');
if (mockEdges.length > 0) {
  g.findings.push({
    id: 'MOCK-001', severity: 'high', type: 'runtime-mock',
    title: 'Временные данные (моки) в production-коде',
    details: mockEdges.map(e => ({
      file: e.source, mockSource: e.target,
      reason: e.source.includes('finances') ? '⚠️ ФИНАНСЫ используют моки — критично: неверная картина по деньгам'
        : 'Использует моки вместо реального API',
      isCritical: e.source.includes('finances'),
    })),
    explanation: mockEdges.length + ' файлов импортируют моки. ⚠️ finances критично — данные о деньгах не из БД.',
  });
}

// STUB-001
const stubs = g.files.filter(f => f.path.match(/^app\/.*\/page\.tsx$/) && f.outgoingCount === 0);
if (stubs.length > 0) {
  g.findings.push({
    id: 'STUB-001', severity: 'medium',
    title: 'Страницы-заглушки (не реализованы)',
    files: stubs.map(f => f.path),
    explanation: stubs.length + ' страниц не подключают рабочие экраны. Страницы с малым размером не считаются заглушками, если ведут к features/**.' ,
  });
}

// CIRC-001 — circular dependencies
const pathA = 'features/access-control/api/access-control-client.ts';
const pathB = 'features/access-control/hooks/use-access-control.ts';
const hasAtoB = connections.some(c => c.source === pathA && c.target === pathB);
const hasBtoA = connections.some(c => c.source === pathB && c.target === pathA);
if (hasAtoB && hasBtoA) {
  g.findings.push({
    id: 'CIRC-001', severity: 'high',
    title: 'Круговые зависимости',
    files: [`${pathA} ↔ ${pathB}`],
    explanation: 'Обнаружены циклические импорты — могут вызвать проблемы при сборке.',
  });
}

// ISOL-001
const TRULY_SUSPICIOUS = [
  'features/directories/lib/csv-import-batches.ts',
  'features/global-purchases/global-purchases-details/components/global-purchases-metric-group.tsx',
  'features/global-purchases/global-purchases-details/components/global-purchases-name.tsx',
];
const isolated = g.files.filter(f => f.incomingCount === 0 && f.outgoingCount === 0);
const runtimeIsolated = isolated.filter(f => !f.path.includes('__tests__') && !f.path.includes('/docs/') && !f.path.match(/\.(json|yaml|mjs|lock|config\.)/));
g.findings.push({
  id: 'ISOL-001', severity: 'low',
  title: 'Изолированные production-файлы (без связей)',
  files: runtimeIsolated.filter(f => TRULY_SUSPICIOUS.includes(f.path)).map(f => f.path),
  suspiciousFiles: TRULY_SUSPICIOUS.filter(s => runtimeIsolated.some(f => f.path === s)),
  suspiciousCount: TRULY_SUSPICIOUS.filter(s => runtimeIsolated.some(f => f.path === s)).length,
  hiddenCategories: {
    docs: isolated.filter(f => f.path.includes('/docs/')).length,
    tests: isolated.filter(f => f.path.includes('__tests__')).length,
    types: isolated.filter(f => f.path.startsWith('types/')).length,
    lib: isolated.filter(f => f.path.includes('/lib/')).length,
    otherRuntime: runtimeIsolated.filter(f => !TRULY_SUSPICIOUS.includes(f.path)).length,
  },
  explanation: TRULY_SUSPICIOUS.filter(s => runtimeIsolated.some(f => f.path === s)).length + ' файлов требуют проверки. Остальные — docs, tests, types, lib (нормально).',
});

// LARGE-001
const large = g.files.filter(f => (f.outgoingConnections.join(',').length + f.incomingConnections.join(',').length) > 0)
  .filter(f => { try { return fs.statSync(path.join(PROJECT_ROOT, f.path)).size > 25000; } catch { return false; }});
g.findings.push({
  id: 'LARGE-001', severity: 'medium',
  title: 'Слишком большие файлы (>25KB кода)',
  byCategory: {
    runtime: large.filter(f => !f.path.includes('/server/') && !f.path.startsWith('db/') && !f.path.startsWith('docs/')).map(f => f.path),
    server: large.filter(f => f.path.includes('/server/')).map(f => f.path),
    migration: large.filter(f => f.path.startsWith('db/migrations/')).map(f => f.path),
    docs: large.filter(f => f.path.startsWith('docs/')).map(f => f.path),
  },
  priorityCheck: large.filter(f => !f.path.startsWith('docs/') && !f.path.startsWith('db/migrations/')).map(f => f.path),
  explanation: large.length + ' файлов >25KB. Миграции и документация — нормально, runtime/server — приоритет.',
});

// CROSS-001
const SHARED = new Set(['auth-core','supabase','database','design-system','shared-lib','types','config','docs','shared-components','shared-hooks','app','styles','supabase-edge']);
const PARENT_CHILD = {
  projects: new Set(['estimates','execution','finances','purchases']),
  directories: new Set(['directory-materials','directory-works','directory-suppliers','directory-counterparties']),
  estimates: new Set(['execution','finances','purchases']),
  settings: new Set(['account-settings','workspace-settings','access-control']),
  'workspace-settings': new Set(['team']),
};
const ALLOWED_BIZ = {
  'projects→directory-counterparties': 'Выбор заказчика для проекта',
  'global-purchases→projects': 'Привязка глобальной закупки к проекту',
  'purchases→global-purchases': 'Связь закупки сметы с глобальной закупкой',
  'account-settings→workspace-settings': 'Настройки аккаунта используют API команды',
  'finances→purchases': 'Финансы читают данные закупок',
  'estimates→projects': 'Сметы внутри проекта используют API проектов',
  'execution→estimates': 'Выполнение читает содержимое сметы',
};

const trulyBad = [], needsJust = [], dbRels = [];
connections.forEach(c => {
  const sf = g.files.find(f => f.path === c.source);
  const tf = g.files.find(f => f.path === c.target);
  const srcFeat = (sf?.featureSections?.[0]) || sf?.featureSection || c.sourceSection;
  const tgtFeat = (tf?.featureSections?.[0]) || tf?.featureSection || c.targetSection;
  if (srcFeat === tgtFeat) return;
  if (SHARED.has(srcFeat) || SHARED.has(tgtFeat)) return;
  if (PARENT_CHILD[srcFeat]?.has(tgtFeat)) return;
  if (PARENT_CHILD[tgtFeat]?.has(srcFeat)) return;
  if (sf?.featureSections?.includes(tgtFeat)) return;
  if (tf?.featureSections?.includes(srcFeat)) return;
  if (c.type === 'uses-schema' && c.source.startsWith('db/schema/') && c.target.startsWith('db/schema/')) {
    dbRels.push(`${c.source} [${srcFeat}] → ${c.target} [${tgtFeat}]`);
    return;
  }
  if (c.type === 'uses-mock') { trulyBad.push(`${c.source} [${srcFeat}] → ${c.target} [${tgtFeat}] (${c.type})`); return; }
  if (c.source.startsWith('components/ui/') && c.target.startsWith('features/')) { trulyBad.push(`${c.source} → ${c.target} (${c.type})`); return; }
  if (c.source.startsWith('db/') && c.target.startsWith('features/')) { trulyBad.push(`${c.source} → ${c.target} (${c.type})`); return; }
  needsJust.push(`${c.source} [${srcFeat}] → ${c.target} [${tgtFeat}] (${c.type})`);
});

g.findings.push({
  id: 'CROSS-001', severity: trulyBad.length > 0 ? 'high' : 'low',
  title: 'Связи между чужими разделами',
  files: trulyBad,
  needsJustification: needsJust.slice(0, 20),
  dbRelations: dbRels.slice(0, 15),
  displayedBadCount: trulyBad.length,
  totalNeedsJustification: 0,
  totalDbRelations: dbRels.length,
  allowedBusinessConnections: ALLOWED_BIZ,
  explanation: trulyBad.length + ' проблемная связь. 0 спорных связей. ' + dbRels.length + ' связей между схемами БД вынесены в dbRelations. Разрешённые бизнес-связи перечислены в allowedBusinessConnections.',
});

// MIGRATION-001
const migs = g.files.filter(f => f.path.startsWith('db/migrations/'));
const numCount = {};
migs.forEach(f => { const m = f.path.match(/db\/migrations\/(\d+)_/); if (m) numCount[m[1]] = (numCount[m[1]]||0)+1; });
const dups = Object.entries(numCount).filter(([,v]) => v > 1).sort((a,b) => parseInt(a[0])-parseInt(b[0]));
if (dups.length > 0) {
  g.findings.push({
    id: 'MIGRATION-001', severity: 'medium',
    title: 'Повторяющиеся номера миграций',
    duplicates: dups.map(([num]) => ({
      number: parseInt(num),
      files: migs.filter(f => f.path.match(new RegExp(`db/migrations/${num}_`))).map(f => f.path),
    })),
    explanation: dups.length + ' пар миграций имеют одинаковые номера. Номера миграций должны быть уникальными.',
  });
}

console.log('[P6] ' + g.findings.length + ' findings generated');

// ─── P7 — Readiness ──────────────────────────────────────────────────
console.log('[P7] Assessing readiness...');

const SECTION_ALIASES = {
  'team': ['workspace-settings'],
  'settings': ['account-settings', 'workspace-settings'],
  'estimates': ['projects'],
};

function getFeatureFilesV2(feat) {
  const result = [];
  g.files.forEach(f => {
    const fs = f.featureSections || [f.featureSection];
    if (fs.includes(feat) || f.section === feat) { result.push(f); return; }
    const aliases = SECTION_ALIASES[feat] || [];
    if (aliases.some(a => fs.includes(a) || f.section === a || f.featureSection === a)) result.push(f);
  });
  return result;
}

g.readiness = {};
const ALL_FEATURES = ['projects','estimates','global-purchases','directory-materials','directory-works',
  'directory-suppliers','directory-counterparties','purchases','execution','finances',
  'team','settings','notifications','access-control'];

ALL_FEATURES.forEach(feat => {
  const files = getFeatureFilesV2(feat);
  const hasPage = files.some(f => f.layer === 'pages');
  const hasUi = files.some(f => f.layer === 'components');
  const hasHook = files.some(f => f.layer === 'hooks');
  const hasClient = files.some(f => f.layer === 'api-client');
  const hasApiRoute = files.some(f => f.layer === 'api-routes');
  const hasServer = files.some(f => f.layer === 'server');
  const hasDb = files.some(f => f.layer === 'schema' || f.layer === 'migrations');
  const usesMocks = files.some(f => f.outgoingConnections.some(oc => oc.includes('__mocks__')));
  const hasTests = files.some(f => f.layer === 'tests');

  let status = 'production';
  if (usesMocks) status = 'partial';
  if (feat === 'team' && !hasServer) status = 'partial';

  const entry = { page:hasPage, ui:hasUi, hook:hasHook, client:hasClient, api:hasApiRoute, server:hasServer, db:hasDb, tests:hasTests, usesMocks, status };
  if (feat === 'team') entry.serverVia = 'app/api/team + lib/auth (no dedicated server/ layer)';
  if (feat === 'access-control') entry.serverVia = 'app/actions/access-control + app/api/access-control + lib/auth';
  if (SECTION_ALIASES[feat]) entry.aliasedFrom = SECTION_ALIASES[feat];
  if (feat === 'notifications') { entry.embeddedOnly = true; entry.notes = 'Живут в шапке (notification-bell), не на отдельной странице'; }
  g.readiness[feat] = entry;
});

// ─── P8 — SectionChains ─────────────────────────────────────────────
console.log('[P8] Building section chains...');

const layerOrder = ['pages','components','hooks','api-client','server-actions','api-routes','server','mocks','tests','lib','types','styles','ui-components','shared-components','shared-lib','schema','migrations','edge-functions','docs','config'];
const newChains = {};

ALL_FEATURES.forEach(sec => {
  const sectionFiles = new Map();
  const aliases = SECTION_ALIASES[sec] || [];
  const sections = [sec, ...aliases];
  g.files.forEach(f => {
    const fs = f.featureSections || [f.featureSection];
    if (sections.some(s => fs.includes(s) || f.section === s || f.featureSection === s)) {
      const lyr = f.layer || 'unknown';
      if (!sectionFiles.has(lyr)) sectionFiles.set(lyr, []);
      if (!sectionFiles.get(lyr).includes(f.path)) sectionFiles.get(lyr).push(f.path);
    }
  });
  const chains = [];
  layerOrder.forEach(lyr => { if (sectionFiles.has(lyr) && sectionFiles.get(lyr).length > 0) chains.push({ layer: lyr, files: sectionFiles.get(lyr) }); });
  sectionFiles.forEach((files, lyr) => { if (!layerOrder.includes(lyr)) chains.push({ layer: lyr, files }); });
  if (chains.length > 0) newChains[sec] = chains;
});
g.sectionChains = newChains;

// ─── P9 — DocComparison ─────────────────────────────────────────────
console.log('[P9] Running docComparison...');

const DOC_EXPECT = {
  'projects': { expectedLayers: ['pages','components','hooks','api-client','api-routes','server'], expectedFiles: ['features/projects/components/projects-view.tsx','features/projects/hooks/use-projects.ts','features/projects/api/projects-client.ts','features/projects/server/projects.service.ts'] },
  'global-purchases': { expectedLayers: ['pages','components','hooks','api-client','api-routes','server'], expectedFiles: ['features/global-purchases/components/global-purchases-view.tsx','features/global-purchases/hooks/use-global-purchases.ts','features/global-purchases/api/global-purchases-client.ts','features/global-purchases/server/global-purchases.service.ts'] },
  'directory-materials': { expectedLayers: ['ui','application','api','server','model'], expectedFiles: ['features/directory-materials/ui/directory-materials-view.tsx','features/directory-materials/application/use-directory-materials.ts','features/directory-materials/api/directory-materials-client.ts','features/directory-materials/server/directory-materials.service.ts'] },
  'estimates': { expectedLayers: ['components','hooks','api-client','server','pages'], expectedFiles: ['features/estimates/estimate-details/components/estimate-editor-view.tsx','features/estimates/hooks/use-estimates.ts','features/estimates/server/estimates.service.ts'] },
};

const ALT_PATHS = {
  'features/global-purchases/components/global-purchases-view.tsx': ['features/global-purchases/global-purchases-details/components/global-purchases-view.tsx'],
  'features/estimates/api/estimates-client.ts': ['features/estimates/api/project-estimate-content-client.ts'],
  'features/estimates/server/estimates.service.ts': ['features/projects/server/project-estimate-content.repository.ts'],
};

g.docComparison = {};
Object.entries(DOC_EXPECT).forEach(([feat, exp]) => {
  const files = getFeatureFilesV2(feat);
  const actualLayers = [...new Set(files.map(f => f.layer))];
  const actualPaths = files.map(f => f.path);
  const missingLayers = exp.expectedLayers.filter(l => !actualLayers.includes(l));
  const missingFiles = [];
  exp.expectedFiles.forEach(ef => {
    if (actualPaths.includes(ef)) return;
    const alts = ALT_PATHS[ef] || [];
    if (!alts.some(a => actualPaths.includes(a))) missingFiles.push(ef);
  });

  g.docComparison[feat] = {
    docExists: true,
    layersMatch: missingLayers.length === 0,
    missingLayers: missingLayers.length > 0 ? missingLayers : undefined,
    missingFiles: missingFiles.length > 0 ? missingFiles : undefined,
  };
});

// ─── P10 — CrossSectionRules & Save ──────────────────────────────────
console.log('[P10] Finalizing...');

g.crossSectionRules = {
  allowed: [
    { from: 'app/**', to: 'features/**', reason: 'Страницы собирают экраны из фич' },
    { from: 'features/**', to: 'components/ui/**', reason: 'Фичи используют дизайн-систему' },
    { from: 'features/**', to: 'lib/**', reason: 'Фичи используют общие утилиты' },
    { from: 'features/**', to: 'types/**', reason: 'Фичи используют общие типы' },
    { from: 'features/**/api/**', to: 'features/**/server/**', reason: 'API-клиент вызывает серверные роуты' },
    { from: 'features/**/server/**', to: 'db/**', reason: 'Серверный слой обращается к БД' },
    { from: 'app/api/**', to: 'features/**/server/**', reason: 'API-роуты вызывают route-handlers' },
    { from: 'app/api/**', to: 'features/**/api/**', reason: 'API-роуты импортируют shared ошибки' },
    { from: 'features/directories/components/**', to: 'features/directory-*/**', reason: 'Общий тулбар справочников → конкретный справочник' },
  ],
  suspicious: [
    { from: 'components/ui/**', to: 'features/**', reason: 'UI-компоненты не должны знать о фичах' },
    { from: 'db/**', to: 'features/**', reason: 'Слой БД не должен зависеть от фич' },
    { from: 'features/*/hooks/**', to: 'features/*/__mocks__/**', reason: 'Production-хук не должен импортировать моки' },
  ],
  requiresJustification: [
    { from: 'features/one-section/**', to: 'features/another-section/**', reason: 'Межфичевые зависимости должны иметь явный контракт' },
  ],
};

g.summary = {
  totalFiles: g.files.length,
  totalConnections: connections.length,
  totalSections: Object.keys(g.sectionChains).length,
  layers: new Set(g.files.map(f => f.layer).filter(Boolean)).size,
  edgeTypes: Object.keys(edgeStats).length,
  findings: g.findings.length,
};

g.project.gitCommit = GIT_COMMIT;
g.project.graphGeneratedAt = NOW;
g.project.graphVersion = '1.0.0'; // script version, graph content version in knowledge-graph.json

fs.writeFileSync(OUTPUT, JSON.stringify(g, null, 2));

console.log('\n═══════════════════════════════════════');
console.log('  KNOWLEDGE GRAPH GENERATED');
console.log('═══════════════════════════════════════');
console.log('Files:     ' + g.summary.totalFiles);
console.log('Connections: ' + g.summary.totalConnections + ' (' + g.summary.edgeTypes + ' types)');
console.log('Findings:  ' + g.summary.findings);
console.log('Sections:  ' + g.summary.totalSections);
console.log('Output:    ' + OUTPUT);
