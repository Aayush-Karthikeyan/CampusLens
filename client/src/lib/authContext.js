import { createContext } from "react";

// Context lives alone so the provider file only exports a component and the
// hook file only exports a hook — otherwise fast refresh complains.
export const AuthContext = createContext(null);
