function initialFor(user: { name: string | null; email: string }) {
  const source = user.name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-16 w-16 text-2xl",
} as const;

export function Avatar({
  user,
  size = "sm",
}: {
  user: { name: string | null; email: string; avatarUrl: string | null };
  size?: keyof typeof sizeClasses;
}) {
  const title = `${user.name ?? user.email}`;

  if (user.avatarUrl) {
    return (
      // avatarUrl is an arbitrary R2/local-dev URL, not a static asset
      // Next can optimize.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={title}
        title={title}
        className={`${sizeClasses[size]} flex-none rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      title={title}
      className={`${sizeClasses[size]} flex flex-none items-center justify-center rounded-full bg-zinc-300 font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200`}
    >
      {initialFor(user)}
    </span>
  );
}
