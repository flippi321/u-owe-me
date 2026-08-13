export const initialsFrom = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('');
