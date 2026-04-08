export default function StyledSelect({
  value,
  onChange,
  placeholder,
  children,
  className = '',
  style = {},
  name,
  disabled,
  id,
  ...rest
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`styled-select ${className}`.trim()}
      style={style}
      {...rest}
    >
      {placeholder ? <option value="" disabled>{placeholder}</option> : null}
      {children}
    </select>
  )
}
