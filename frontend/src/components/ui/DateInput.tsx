import React from "react";
import { GcdsDateInput } from "@gcds-core/components-react";

interface InputProps {
  hint?: string;
  legend: string;
  name: string;
  onInput?: React.FormEventHandler<Element>;
  value?: string;
  validateOn?: "blur" | "submit" | "other";
  required?: boolean;
  className?: string;
  format: "full" | "compact";
}

const Input: React.FC<InputProps> = React.memo(
  ({
    hint,
    legend,
    name,
    onInput,
    validateOn,
    required,
    value,
    className,
    format,
  }) => (
    <GcdsDateInput
      className={className}
      format={format}
      hint={hint}
      legend={legend}
      name={name}
      required={required}
      validateOn={validateOn}
      value={value}
      onInput={onInput}
    ></GcdsDateInput>
  ),
);

export default Input;
