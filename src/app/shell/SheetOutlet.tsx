import React from 'react';
import { Outlet } from 'react-router-dom';

// Renders whichever sheet route is nested under the screen that hosts it.
// It belongs inside that screen's element, not in AppShell: an <Outlet/> at
// the AppShell level resolves to the *tab* route, so putting one there would
// render the active tab twice.
export const SheetOutlet: React.FC = () => <Outlet />;
