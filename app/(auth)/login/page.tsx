import { LoginForm } from "./login-form";

function getSafeNext(next: string | string[] | undefined) {
  const nextPath = Array.isArray(next) ? next[0] : next;
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.startsWith("/login")) {
    return "/dashboard";
  }

  return nextPath;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[]; setup?: string; error?: string }>;
}) {
  const params = await searchParams;
  const setupMissing = params?.setup === "supabase";
  const authError = params?.error === "auth";
  const profileError = params?.error === "profile";

  return (
    <main className="app-shell flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl">
        <div className="mb-8 rounded-[1.5rem] bg-[#111111] p-6 text-white">
          <div className="text-sm font-bold text-[#ffc400]">ระบบร้านไก่ทอด</div>
          <h1 className="mt-2 text-4xl font-black leading-tight">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-white/70">สำหรับพนักงานและเจ้าของร้าน รองรับมือถือและติดตั้งเป็น PWA</p>
        </div>
        {setupMissing && (
          <div className="mb-5 rounded-2xl bg-yellow-50 p-3 font-bold text-yellow-900">
            ยังไม่ได้ตั้งค่า Supabase บนระบบนี้ กรุณาตรวจสอบ Environment Variables
          </div>
        )}
        {authError && (
          <div className="mb-5 rounded-2xl bg-red-50 p-3 font-bold text-red-700">
            เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง
          </div>
        )}
        {profileError && (
          <div className="mb-5 rounded-2xl bg-red-50 p-3 font-bold text-red-700">
            ไม่พบหรือสร้างโปรไฟล์ผู้ใช้ไม่ได้ กรุณาตรวจสอบว่าได้รัน SQL ล่าสุดใน Supabase แล้ว
          </div>
        )}
        <LoginForm next={getSafeNext(params?.next)} />
      </div>
    </main>
  );
}
