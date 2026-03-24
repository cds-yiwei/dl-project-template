import React from "react";
import { GcdsInput } from "@gcds-core/components-react";

interface InputProps {
  hint?: string;
  label: string;
  name: string;
  onInput?: React.FormEventHandler<Element>;
  inputId: string;
  value?: string;
  validateOn?: "blur" | "submit" | "other";
  required?: boolean;
  size?: number;
  className?: string;
  type?: "text" | "email" | "number" | "password" | "search";
}

const Input: React.FC<InputProps> = React.memo(
  ({
    hint,
    label,
    name,
    onInput,
    inputId,
    validateOn,
    required,
    value,
    size,
    className,
    type,
  }) => (
    <GcdsInput
      className={className}
      hint={hint}
      inputId={inputId}
      label={label}
      name={name}
      required={required}
      size={size}
      type={type}
      validateOn={validateOn}
      value={value}
      onInput={onInput}
    ></GcdsInput>
  ),
);

export default Input;
