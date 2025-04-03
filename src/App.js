import HCPHCOdeepDive from "./Components/HCPHCOdeepdive/HCPHCOdeepDive";
import Header from "./Header/Header";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Header />} />
          <Route path='/hcp-hco' element={<HCPHCOdeepDive />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;
