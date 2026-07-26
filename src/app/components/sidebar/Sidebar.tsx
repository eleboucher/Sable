import classNames from 'classnames';
import { as } from '$components/ui';
import * as css from './Sidebar.css';

export const Sidebar = as<'div'>(({ as: AsSidebar = 'div', className, ...props }, ref) => (
  <AsSidebar className={classNames(css.Sidebar, className)} {...props} ref={ref} />
));
