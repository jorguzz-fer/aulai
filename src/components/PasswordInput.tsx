"use client";

import { useState } from "react";

export function PasswordInput({
  name,
  placeholder,
  required,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        className="input"
        type={show ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label="Mostrar senha">
        {show ? "ocultar" : "mostrar"}
      </button>
    </div>
  );
}
