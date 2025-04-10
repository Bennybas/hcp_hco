import React from 'react';
import Header from './Header/Header';


const Layout = ({ children }) => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;