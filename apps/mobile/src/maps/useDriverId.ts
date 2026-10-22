/**
 * Which driver the map belongs to.
 *
 * The map mode and the map settings are remembered **per driver**, so the
 * map has to know who is driving. A shared van phone can carry more than one
 * driver, and the driver who had the 3D map on is not the driver who has it
 * now.
 *
 * The session itself lives in the auth provider; the map reads the driver id
 * from the session store (`@/sync/driverSession`), so the map screen does
 * not pull the auth client in with it.
 */
export { useDriverId, LOCAL_DRIVER_ID } from '@/sync/driverSession';
