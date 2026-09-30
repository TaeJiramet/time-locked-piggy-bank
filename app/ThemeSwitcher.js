"use client";
import { useEffect, useState } from "react";

const THEMES = [
  {
    id: "aurora",
    label: "ออโร่า",
    swatch: "linear-gradient(135deg, #7c5cff, #38bdf8)",
  },
  {
    id: "sunset",
    label: "ซันเซ็ท",
    swatch: "linear-gradient(135deg, #fb7185, #fbbf24)",
  },
  {
    id: "daylight",
    label: "มินิมัล",
    swatch: "linear-gradient(135deg, #f1f5f9, #6366f1)",
  },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("aurora");

  // อ่านธีมที่ผู้ใช้เคยเลือกไว้ หลัง mount (กัน hydration mismatch)
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem("pg-theme");
    } catch (e) {}
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const applyTheme = (id) => {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("pg-theme", id);
    } catch (e) {}
  };

  return (
    <div className="theme-switch" role="group" aria-label="เลือกธีมสี">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="theme-dot"
          style={{ background: t.swatch }}
          title={`ธีม ${t.label}`}
          aria-label={`ธีม ${t.label}`}
          aria-pressed={theme === t.id}
          onClick={() => applyTheme(t.id)}
        />
      ))}
    </div>
  );
}
