"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

interface SearchFieldType {
  searchField: string;
  isDialogOpen: boolean;
  selectedCustomerId: string | null;
  setSelectedCustomerId: Dispatch<SetStateAction<string | null>>;
  setSearchField: Dispatch<SetStateAction<string>>;
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
}

const SearchFieldContext = createContext<SearchFieldType | "">("");

export const SearchFieldProvider = ({ children }: { children: ReactNode }) => {
  const [searchField, setSearchField] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const values = {
    searchField,
    setSearchField,
    isDialogOpen,
    setIsDialogOpen,
    selectedCustomerId,
    setSelectedCustomerId,
  };

  return (
    <SearchFieldContext.Provider value={values}>
      {children}
    </SearchFieldContext.Provider>
  );
};

export function useSearchField() {
  const context = useContext(SearchFieldContext);

  // Guard clause to ensure hook is called within its provider boundaries
  if (!context) {
    throw new Error("useSearchField must be used within a SearchFieldProvider");
  }

  return context;
}
