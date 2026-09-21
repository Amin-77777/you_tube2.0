import axios from "axios";

import { getBackendUrl } from "./backendUrl";

const axiosInstance = axios.create({
  baseURL: getBackendUrl(),
});

export default axiosInstance;