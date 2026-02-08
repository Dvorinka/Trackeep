import { Router, Route } from '@solidjs/router';
import { Dashboard } from './components/Dashboard';
import { CourseManagement } from './components/CourseManagement';
import { InstanceManagement } from './components/InstanceManagement';
import './styles.css';

function App() {
  return (
    <Router>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/courses" component={CourseManagement} />
      <Route path="/dashboard/instances" component={InstanceManagement} />
    </Router>
  );
}

export default App;
