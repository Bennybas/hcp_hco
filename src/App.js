import HCOdeepDive from "./Components/HCPHCOdeepdive/HCOdeepDive";
import HCPdeepDive from "./Components/HCPHCOdeepdive/HCPHCOdeepDive";
import Header from "./Header/Header";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Header />} />
          <Route path='/hcp' element={<HCPdeepDive />} />
          <Route path='/hco' element={<HCOdeepDive />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;
