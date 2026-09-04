import React from "react";

function Header({
  heading,
  description,
}: {
  heading: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {heading}
        </h1>

        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default Header;
