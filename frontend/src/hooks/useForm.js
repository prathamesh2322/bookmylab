import { useState } from 'react';

/**
 * Exp 4: custom hook for form handling + validation.
 * validate(values) must return an object like { fieldName: 'error message' }.
 */
export default function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched[name]) setErrors(validate(next));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = (onValid) => async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched(Object.keys(values).reduce((all, key) => ({ ...all, [key]: true }), {}));
    if (Object.keys(found).length === 0) await onValid(values);
  };

  const reset = (next = initialValues) => {
    setValues(next);
    setErrors({});
    setTouched({});
  };

  return { values, setValues, errors, touched, handleChange, handleBlur, handleSubmit, reset };
}
