"use client";
import { useEffect, useRef, useState } from "react";

// Dropdown เลือกเวลาแบบกำหนดเอง
// - จำกัดความสูงเมนู (max-height) + scrollbar ไม่ให้ล้นจอ
// - เปิดชิดขอบล่าง → สลับเปิดด้านบนให้อัตโนมัติ
// - คลิกข้างนอก / กด Esc เพื่อปิด
export default function TimeSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  // ปิดเมนูเมื่อคลิกที่อื่น หรือกด Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // ตอนเปิดเมนู ให้เลื่อนตัวเลือกปัจจุบันเข้ามาใน view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // ที่ว่างด้านล่างไม่พอสำหรับเมนู → เปิดด้านบนแทน
      setOpenUp(window.innerHeight - rect.bottom < 220 && rect.top > 240);
    }
    setOpen((o) => !o);
  };

  const pick = (v) => {
    onChange(v);
    setOpen(false);
    if (btnRef.current) btnRef.current.focus();
  };

  return (
    <div className="tsel" ref={wrapRef}>
      <button
        type="button"
        className="input time-select"
        ref={btnRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} ${value || ""}`.trim()}
        onClick={toggle}
      >
        {value || "--"}
      </button>

      {open && (
        <div
          className={`tsel-menu${openUp ? " tsel-menu--up" : ""}`}
          role="listbox"
          aria-label={label}
        >
          <div className="tsel-list" ref={listRef}>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                className={`tsel-opt${opt === value ? " is-active" : ""}`}
                data-selected={opt === value ? "true" : undefined}
                aria-selected={opt === value}
                onClick={() => pick(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
