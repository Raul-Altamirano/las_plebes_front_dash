import React from "react";

type UserStatus = "ACTIVE" | "SUSPENDED";

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const isActive = status === "ACTIVE";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
        isActive
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-gray-100 text-gray-700 border-gray-200",
      ].join(" ")}
    >
      {isActive ? "Activo" : "Suspendido"}
    </span>
  );
}
