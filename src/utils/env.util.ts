/**
 * Utility function to safely get environment variables.
 * Provides a centralized way to access process.env variables
 * with optional default values.
 */
export const getMyEnv = (
  key: string,
  defaultValue?: string
): string | undefined => {
  const value = process.env[key];

  return value !== undefined ? value : defaultValue;
};

/**
 * Get environment variable as a number.
 */
export const getMyEnvAsNumber = (
  key: string,
  defaultValue = 0
): number => {
  const value = getMyEnv(key);

  return value ? Number(value) : defaultValue;
};

/**
 * Get environment variable as a boolean.
 */
export const getMyEnvAsBool = (
  key: string,
  defaultValue = false
): boolean => {
  const value = getMyEnv(key);

  if (value === undefined) {
    return defaultValue;
  }

  return value === "true" || value === "1";
};

/**
 * Get environment variable as an array
 * (comma-separated values).
 */
export const getMyEnvAsArray = (
  key: string,
  defaultValue: string[] = []
): string[] => {
  const value = getMyEnv(key);

  return value
    ? value.split(",").map((item) => item.trim())
    : defaultValue;
};