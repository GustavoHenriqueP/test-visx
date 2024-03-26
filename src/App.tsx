import { ParentSize } from '@visx/responsive';
import AreaTest from './AreaTest';
import './App.css';
import AreaTestZoomX from './AreaTestZoomX';
// import ZoomI from './Zoom';

const margin = { top: 24, right: 24, bottom: 48, left: 48 };
// const margin = { top: 0, right: 0, bottom: 0, left: 0 };

function App() {
  return (
    <div className="bg">
      <div className="main-chart">
        <ParentSize debounceTime={100}>
          {({ width, height }) => (
            <AreaTest width={width} height={height} margin={margin} />
            // <AreaTestZoomX width={width} height={height} margin={margin} />
          )}
        </ParentSize>
      </div>
    </div>
  );
}

export default App;
