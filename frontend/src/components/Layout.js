
import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "./layout.css";

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar showUtility={false} />
      <main className="page-body" role="main" id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
