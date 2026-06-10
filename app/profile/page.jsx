"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  User,
  Save,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  Mail,
  School,
  BookMarked,
  MessageCircleMore,
  Lightbulb,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { getSession } from "next-auth/react";

// Reusable password rule component
const PasswordCheck = ({ label, valid }) => (
  <div className="flex items-center gap-2 text-sm">
    {valid ? (
      <span className="text-green-600 font-bold">✔</span>
    ) : (
      <span className="text-red-500 font-bold">✘</span>
    )}
    <span className={valid ? "text-green-600" : "text-red-500"}>{label}</span>
  </div>
);

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    oldPass: "",
    newPass: "",
    confirmPass: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const [user, setUser] = useState({ name: "", image: "" });

  useEffect(() => {
    fetchProfile();
  }, []);
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session || !session.user) {
        router.push("/login");
        return;
      } else {
        setUser({
          name: session.user.name || "",
          image: session.user.image || "",
        });
      }
    };
    checkAuth();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile"); // ❌ No headers needed
      const data = await response.json();
      if (response.ok) {
        setFormData(data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- PASSWORD VALIDATION ---
  const { newPass: password = "", confirmPass = "" , oldPass = ""} = formData;

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password && password === confirmPass,
  };

  const allGood =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.match;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    if (!formData.oldPass) {
      setError("Old Password is required.");
      setIsSaving(false);
      return;
    }
    if (!formData.newPass) {
      setError("New Password is required.");
      setIsSaving(false);
      return;
    }
    if (!allGood) {
      setError("New password does not meet all requirements.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Profile updated successfully!");
        setFormData((prev) => ({
          ...prev,
          oldPass: "",
          newPass: "",
          confirmPass: "",
        }));
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST" });

      if (res.ok) {
        // Clear LocalStorage
        localStorage.removeItem("auth_token");
        localStorage.clear(); // optional: clears all keys
        sessionStorage.clear();
        window.location.href = "/login";
        router.push("/login");
        // Optional: redirect user
        // window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

return (
    <div className="min-h-screen bg-[#F3EDE1] flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #F3EDE1; margin: 0; }
        .serif { font-family: 'Fraunces', serif; }

        .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; font-size:0.875rem; color:#7A7568; text-decoration:none; transition:background .15s,color .15s; }
        .nav-item:hover { background:#EDE7DA; color:#1C1F1A; }

        .sidebar-overlay { position:fixed; inset:0; background:rgba(28,31,26,0.3); z-index:40; display:none; }
        .sidebar-overlay.show { display:block; }

        .logout-btn { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border-radius:8px; border:none; background:transparent; cursor:pointer; font-size:0.875rem; color:#A09B92; transition:background .15s,color .15s; font-family:'DM Sans',sans-serif; }
        .logout-btn:hover { background:#FCEAEA; color:#B94040; }

        .form-input { width:100%; padding:10px 14px; background:#FDFAF5; border:1.5px solid #D6CFBF; border-radius:9px; font-size:0.875rem; font-family:'DM Sans',sans-serif; color:#1C1F1A; transition:border-color .15s; }
        .form-input::placeholder { color:#C4BDB0; }
        .form-input:focus { outline:none; border-color:#5C6B5C; box-shadow:0 0 0 3px rgba(92,107,92,0.1); }
        .form-input:disabled { opacity:.5; cursor:not-allowed; background:#F3EDE1; }

        .save-btn { width:100%; background:#3A4A3A; color:#FDFAF5; padding:11px; border-radius:9px; font-size:0.875rem; font-weight:500; border:none; cursor:pointer; transition:background .15s; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'DM Sans',sans-serif; }
        .save-btn:hover { background:#1C1F1A; }
        .save-btn:disabled { opacity:.45; cursor:not-allowed; }

        .skeleton { background:#E8E2D6; border-radius:8px; animation:pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay show" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ─── SIDEBAR ─── */}
      <div
        className={`fixed left-0 top-0 h-full w-60 bg-[#FDFAF5] border-r border-[#D6CFBF] z-50 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#D6CFBF] flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-md overflow-hidden border border-[#D6CFBF] flex-shrink-0">
            <img src="/chatterly_logo.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <span className="serif text-[1.05rem] text-[#1C1F1A]">ChatterlyAI</span>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-0.5 flex-1">
          <p className="text-[0.62rem] font-medium tracking-[0.1em] uppercase text-[#C4BDB0] px-3 mb-2">Menu</p>
          <Link href="/dashboard"  className="nav-item"><LayoutDashboard size={15} /> Dashboard</Link>
          <Link href="/ask-doubt"  className="nav-item"><Lightbulb size={15} /> AI Chatbot</Link>
          <Link href="/chat"       className="nav-item"><MessageCircleMore size={15} /> Chat with Friends</Link>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 pt-2 border-t border-[#D6CFBF] flex-shrink-0">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {/* ─── MAIN ─── */}
      <div className="lg:ml-60 flex flex-col flex-1">

        {/* Header */}
        <header className="bg-[#F3EDE1]/90 backdrop-blur-md border-b border-[#D6CFBF] px-5 py-3.5 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md border border-[#D6CFBF] bg-transparent cursor-pointer text-[#7A7568] hover:bg-[#EDE7DA] transition-colors"
            >
              {isSidebarOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
            <h1 className="serif text-[1.2rem] text-[#1C1F1A] tracking-tight">Profile</h1>
          </div>

          <Link href="/profile">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D6CFBF] cursor-pointer">
              {user?.image ? (
                <img src={user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#3A4A3A] flex items-center justify-center">
                  <User size={14} className="text-[#F3EDE1]" />
                </div>
              )}
            </div>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 py-8 max-w-xl w-full mx-auto">

          {/* Profile hero strip */}
          <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl px-6 py-5 flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full overflow-hidden border border-[#D6CFBF] flex-shrink-0 bg-[#3A4A3A] flex items-center justify-center">
              {user?.image ? (
                <img src={user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User size={22} className="text-[#F3EDE1]" />
              )}
            </div>
            <div>
              <p className="serif text-[1.25rem] text-[#1C1F1A] leading-tight tracking-tight">
                {user?.name || "Your Profile"}
              </p>
              <p className="text-xs text-[#A09B92] mt-0.5">Manage your account information</p>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-[#FDFAF5] border border-[#D6CFBF] rounded-xl p-6 md:p-8">

            {/* Success */}
            {success && (
              <div className="bg-[#EAF4EE] border border-[#A8D5B5] text-[#2A6B3A] text-sm px-4 py-3 rounded-lg mb-6">
                {success}
              </div>
            )}
            {/* Error */}
            {error && (
              <div className="bg-[#FCEAEA] border border-[#F5B8B8] text-[#B94040] text-sm px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="skeleton h-3 w-24 mb-2" />
                    <div className="skeleton h-11 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Full name */}
                <div>
                  <label htmlFor="name" className="flex items-center gap-1.5 text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">
                    <User size={12} /> Full name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                    className="form-input"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">
                    <Mail size={12} /> Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    className="form-input"
                    disabled
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-[#D6CFBF] my-1" />
                <p className="text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em]">Change password</p>

                {/* Old password */}
                <div>
                  <label htmlFor="oldPass" className="flex items-center gap-1.5 text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">
                    <Lock size={12} /> Current password
                  </label>
                  <input
                    type="password"
                    id="oldPass"
                    name="oldPass"
                    value={formData.oldPass}
                    onChange={handleChange}
                    required
                    placeholder="Enter current password"
                    className="form-input"
                  />
                </div>

                {/* New password */}
                <div>
                  <label htmlFor="newPass" className="flex items-center gap-1.5 text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">
                    <Lock size={12} /> New password
                  </label>
                  <input
                    type="password"
                    id="newPass"
                    name="newPass"
                    value={formData.newPass}
                    onChange={handleChange}
                    required
                    placeholder="Enter new password"
                    className="form-input"
                  />
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirmPass" className="flex items-center gap-1.5 text-xs font-medium text-[#7A7568] uppercase tracking-[0.08em] mb-1.5">
                    <Lock size={12} /> Confirm new password
                  </label>
                  <input
                    type="password"
                    id="confirmPass"
                    name="confirmPass"
                    value={formData.confirmPass}
                    onChange={handleChange}
                    required
                    placeholder="Confirm new password"
                    className="form-input"
                  />
                </div>

                {/* Password checks */}
                {password.length > 0 && (
                  <div className="bg-[#F3EDE1] border border-[#D6CFBF] rounded-lg px-4 py-3 space-y-1.5">
                    {[
                      { label: "At least 8 characters",  valid: passwordChecks.length  },
                      { label: "One uppercase letter",    valid: passwordChecks.upper   },
                      { label: "One number",              valid: passwordChecks.number  },
                      { label: "One special character",   valid: passwordChecks.special },
                      { label: "Passwords match",         valid: passwordChecks.match   },
                    ].map(({ label, valid }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${valid ? "bg-[#5C6B5C] text-white" : "bg-[#D6CFBF] text-[#A09B92]"}`}>
                          {valid ? "✓" : "·"}
                        </span>
                        <span className={`text-xs transition-colors ${valid ? "text-[#3A4A3A]" : "text-[#A09B92]"}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={isSaving} className="save-btn">
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#FDFAF5]/40 border-t-[#FDFAF5] rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save changes
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}