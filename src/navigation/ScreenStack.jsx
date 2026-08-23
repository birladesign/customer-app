import { useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigation } from './NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import LoginFlow from '../screens/Login/LoginFlow.jsx';
import Home from '../screens/Home.jsx';
import MyOrders from '../screens/MyOrders.jsx';
import Support from '../screens/Support.jsx';
import Profile from '../screens/Profile.jsx';
import PersonalInformation from '../screens/Profile/PersonalInformation.jsx';
import Addresses from '../screens/Profile/Addresses.jsx';
import AddAddress from '../screens/Profile/AddAddress.jsx';
import Notifications from '../screens/Profile/Notifications.jsx';
import Invoices from '../screens/Profile/Invoices.jsx';
import Requests from '../screens/Profile/Requests.jsx';
import RequestDetail from '../screens/Profile/RequestDetail.jsx';
import OrderDetails from '../screens/OrderDetails.jsx';
import EditOrder from '../screens/EditOrder.jsx';
import EditShipmentOrder from '../screens/EditShipmentOrder.jsx';
import InstallationSchedule from '../screens/InstallationSchedule.jsx';
import ReturnReplaceFlow from '../screens/ReturnReplace/ReturnReplaceFlow.jsx';
import RtoReplaceFlow from '../screens/RtoReplace/RtoReplaceFlow.jsx';
import DeliverySchedule from '../screens/DeliverySchedule.jsx';
import './ScreenStack.css';

const SCREENS = {
  login: LoginFlow,
  home: Home,
  myOrders: MyOrders,
  support: Support,
  profile: Profile,
  personalInformation: PersonalInformation,
  addresses: Addresses,
  addAddress: AddAddress,
  notifications: Notifications,
  invoices: Invoices,
  requests: Requests,
  requestDetail: RequestDetail,
  orderDetails: OrderDetails,
  editOrder: EditOrder,
  editShipmentOrder: EditShipmentOrder,
  installationSchedule: InstallationSchedule,
  returnReplace: ReturnReplaceFlow,
  rtoReplace: RtoReplaceFlow,
  deliverySchedule: DeliverySchedule,
};

// Spatial consistency: a pushed screen slides in from the right while the one
// behind it recedes left and dims; going back reverses the exact same path —
// never a different route in than out.
export default function ScreenStack() {
  const { stack, current } = useNavigation();
  const reduceMotion = useReducedMotion();
  const prevDepthRef = useRef(stack.length);
  const direction = stack.length >= prevDepthRef.current ? 1 : -1; // 1 = push, -1 = pop
  prevDepthRef.current = stack.length;

  const CurrentScreen = SCREENS[current.screen];
  const screenKey = current.key;

  const enterX = direction > 0 ? '100%' : '-30%';
  const enterOpacity = direction > 0 ? 1 : 0.6;
  const exitX = direction > 0 ? '-30%' : '100%';
  const exitOpacity = direction > 0 ? 0.6 : 1;

  return (
    <div className="screen-stack">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={screenKey}
          className="screen-stack__layer"
          initial={reduceMotion ? { opacity: 0 } : { x: enterX, opacity: enterOpacity }}
          animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { x: exitX, opacity: exitOpacity }}
          transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
        >
          <CurrentScreen params={current.params} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
