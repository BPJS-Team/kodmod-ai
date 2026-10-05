"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { speechOutput } from "@/lib/browser-speech";
import { useVoicePreferences } from "@/components/voice-preferences-provider";
import { useI18n } from "@/components/language-provider";

export type SelectOption = {
  value: string;
  label: ReactNode;
  text: string;
  disabled?: boolean;
};

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode })?.children);
  }
  return "";
}

function extractOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "option") {
      const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      const value = String(props.value ?? "");
      const label = props.children;
      const text = extractText(label).trim() || value;
      options.push({ value, label, text, disabled: Boolean(props.disabled) });
    } else if (child.type === React.Fragment) {
      options.push(...extractOptions((child.props as { children?: ReactNode }).children));
    }
  });
  return options;
}

function nextEnabledOptionIndex(options: SelectOption[], current: number, direction: 1 | -1) {
  if (!options.length) return -1;
  const start = current >= 0 ? current : direction === 1 ? -1 : 0;
  for (let step = 1; step <= options.length; step += 1) {
    const index = ((start + direction * step) % options.length + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export type NativeSelectProps = Omit<ComponentProps<"select">, "size"> & {
  placeholder?: string;
  triggerClassName?: string;
  "data-voice-menu"?: string;
};

export function NativeSelect({
  className,
  children,
  value: controlledValue,
  defaultValue,
  onChange,
  disabled = false,
  required,
  name,
  id,
  placeholder,
  "data-voice-menu": dataVoiceMenu,
  ...rest
}: NativeSelectProps) {
  const options = extractOptions(children);
  const [internalValue, setInternalValue] = useState<string>(() => {
    if (controlledValue !== undefined) return String(controlledValue);
    if (defaultValue !== undefined) return String(defaultValue);
    return options[0]?.value ?? "";
  });

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);

  const listboxId = useId();
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? String(controlledValue) : internalValue;
  const explicitAriaLabel = rest["aria-label"];
  const explicitAriaLabelledBy = rest["aria-labelledby"];

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || explicitAriaLabel || explicitAriaLabelledBy) return;
    const labels = Array.from(nativeSelectRef.current?.labels ?? []);
    const labelText = labels
      .map((label) => {
        const copy = label.cloneNode(true) as HTMLElement;
        copy.querySelectorAll(".kodmod-select-wrapper").forEach((wrapper) => wrapper.remove());
        return copy.textContent?.replace(/\s+/g, " ").trim() ?? "";
      })
      .filter(Boolean)
      .join(" ");
    if (labelText) trigger.setAttribute("aria-label", labelText);
    else trigger.removeAttribute("aria-label");
  }, [children, explicitAriaLabel, explicitAriaLabelledBy, id, name]);

  let menuEnabled = true;
  let engine = "app";
  try {
    const voice = useVoicePreferences();
    menuEnabled = voice.menuEnabled;
    engine = voice.engine;
  } catch {
    // Outside VoicePreferencesProvider
  }

  let language: "id" | "en" = "id";
  try {
    const i18n = useI18n();
    language = i18n.language;
  } catch {
    // Outside LanguageProvider
  }

  const isLanguageSelect =
    className?.includes("toolbar-language") ||
    dataVoiceMenu === "language" ||
    name === "language";

  const getOptionMenuKey = useCallback(
    (val: string) => {
      if (!isLanguageSelect) return undefined;
      if (val === "id") return "lang-id";
      if (val === "en") return "lang-en";
      return undefined;
    },
    [isLanguageSelect],
  );

  const getSelectedMenuKey = useCallback(
    (val: string) => {
      if (!isLanguageSelect) return undefined;
      if (val === "id") return "lang-id-selected";
      if (val === "en") return "lang-en-selected";
      return undefined;
    },
    [isLanguageSelect],
  );

  const selectedOption = options.find((opt) => opt.value === currentValue) ?? options[0];

  const speak = useCallback(
    (text: string, delay = 60, menuKey?: string) => {
      if (!menuEnabled || engine === "off" || !text.trim()) return;
      speechOutput.queueMenu(
        { owner: "menu", text, engine: engine === "device" ? "device" : "app", language, menuKey },
        () => true,
        delay,
      );
    },
    [menuEnabled, engine, language],
  );

  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (option.disabled || disabled) return;
      if (!isControlled) {
        setInternalValue(option.value);
      }
      setIsOpen(false);
      triggerRef.current?.focus();

      // Announce selection
      const announcement =
        language === "en" ? `${option.text} selected.` : `${option.text} dipilih.`;
      speak(announcement, 20, getSelectedMenuKey(option.value));

      // Trigger onChange for forms and callers
      if (onChange) {
        const syntheticEvent = {
          target: { value: option.value, name: name ?? "" },
          currentTarget: { value: option.value, name: name ?? "" },
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    },
    [disabled, getSelectedMenuKey, isControlled, language, name, onChange, speak],
  );

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        let idx = options.findIndex((opt) => opt.value === currentValue && !opt.disabled);
        if (idx < 0) idx = options.findIndex((opt) => !opt.disabled);
        setHighlightedIndex(idx);
        const curText = selectedOption?.text ?? "";
        const announce =
          language === "en"
            ? `Options opened. Currently selected: ${curText}`
            : `Daftar pilihan dibuka. Pilihan saat ini: ${curText}`;
        speak(announce, 40, isLanguageSelect ? "dropdown-opened" : undefined);
      } else {
        speechOutput.cancelQueuedMenu();
      }
      return next;
    });
  }, [currentValue, disabled, isLanguageSelect, language, options, selectedOption?.text, speak]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Key navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggleOpen();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = nextEnabledOptionIndex(options, highlightedIndex, 1);
        if (next < 0) break;
        setHighlightedIndex(next);
        const opt = options[next];
        if (opt) speak(opt.text, 50, getOptionMenuKey(opt.value));
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prev = nextEnabledOptionIndex(options, highlightedIndex, -1);
        if (prev < 0) break;
        setHighlightedIndex(prev);
        const opt = options[prev];
        if (opt) speak(opt.text, 50, getOptionMenuKey(opt.value));
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) handleSelect(opt);
        break;
      }
      case "Escape": {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      }
      case "Tab": {
        setIsOpen(false);
        break;
      }
    }
  };

  const accessibleName = explicitAriaLabel ?? (language === "en" ? "Options" : "Pilihan");
  const activeOption = options[highlightedIndex];
  const activeOptionId = isOpen && activeOption && !activeOption.disabled
    ? `${listboxId}-option-${highlightedIndex}`
    : undefined;

  return (
    <div
      ref={wrapperRef}
      className={cn("kodmod-select-wrapper", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native select for standard HTML forms and FormData support */}
      <select
        ref={nativeSelectRef}
        name={name}
        id={id}
        value={currentValue}
        required={required}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "1px",
          height: "1px",
          margin: "-1px",
          clip: "rect(0, 0, 0, 0)",
        }}
        onChange={(e) => {
          if (!isControlled) setInternalValue(e.target.value);
          onChange?.(e);
        }}
      >
        {children}
      </select>

      {/* Accessible Custom Combobox Trigger */}
      <button
        type="button"
        ref={triggerRef}
        role="combobox"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-label={accessibleName}
        aria-labelledby={rest["aria-labelledby"]}
        aria-describedby={rest["aria-describedby"]}
        aria-invalid={rest["aria-invalid"]}
        aria-required={required || undefined}
        disabled={disabled}
        className={cn("kodmod-select-trigger", isOpen && "is-open")}
        onClick={toggleOpen}
      >
        <span className="kodmod-select-value">
          {selectedOption ? selectedOption.label : placeholder || ""}
        </span>
        <span className="kodmod-select-icon" aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </button>

      {/* Custom Popup Listbox */}
      {isOpen && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="kodmod-select-menu"
          aria-labelledby={explicitAriaLabelledBy ?? `${listboxId}-trigger`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === currentValue;
            const isHighlighted = idx === highlightedIndex;
            const optMenuKey = getOptionMenuKey(opt.value);

            return (
              <li
                key={opt.value}
                id={`${listboxId}-option-${idx}`}
                role="option"
                data-voice-menu={optMenuKey}
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                className={cn(
                  "kodmod-select-option",
                  isSelected && "is-selected",
                  isHighlighted && "is-highlighted",
                  opt.disabled && "is-disabled",
                )}
                onClick={() => handleSelect(opt)}
                onPointerOver={() => {
                  if (opt.disabled) return;
                  setHighlightedIndex(idx);
                  speak(opt.text, 50, optMenuKey);
                }}
              >
                <span className="option-label">{opt.label}</span>
                {isSelected && (
                  <span className="option-check" aria-hidden="true">
                    <Check size={16} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { NativeSelect as Select };
