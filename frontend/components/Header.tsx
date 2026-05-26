"use client";

import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './providers/AuthProvider';

export default function Header() {
  // El Header antiguo ya no se usa porque DashboardLayout tiene su propio Header
  return null;
}
