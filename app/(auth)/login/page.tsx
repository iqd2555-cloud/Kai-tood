import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="app-shell flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl">
        <div className="mb-8 rounded-[1.5rem] bg-[#111111] p-6 text-white">
          <div className="text-sm font-bold text-[#ffc400]">ระบบร้านไก่ทอด</div>
          <h1 className="mt-2 text-4xl font-black leading-tight">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-white/70">สำหรับพนักงานและเจ้าของร้าน รองรับมือถือและติดตั้งเป็น PWA</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
