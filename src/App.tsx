import { ParentSize } from '@visx/responsive';
import AreaTest from './AreaTest';
import './App.css';
import ZoomI from './Zoom';

const margin = { top: 48, right: 48, bottom: 48, left: 48 };

function App() {
  return (
    <div className="bg">
      <div className="main-chart">
        <ParentSize debounceTime={100}>
          {({ width, height }) => (
            <ZoomI width={width} height={height} />
            // <AreaTest width={width} height={height} margin={margin} />
          )}
        </ParentSize>
      </div>
    </div>
  );
}

export default App;
