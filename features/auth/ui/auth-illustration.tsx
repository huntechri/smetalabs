import Image from "next/image"

export function AuthIllustration() {
  return (
    <div className="relative hidden bg-muted md:block">
      <Image
        src="/images/auth-bg.png"
        alt="Интерьер строительного проекта"
        fill
        priority
        sizes="50vw"
        className="object-cover dark:brightness-[0.2] dark:grayscale"
      />
    </div>
  )
}
