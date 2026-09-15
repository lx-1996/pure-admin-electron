import { reactive } from "vue";
import type { FormRules } from "element-plus";
/** 密码正则（密码格式应为8-18位数字、字母、符号的任意两种组合） */
export const IP_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

/** 登录校验 */
const ipRules = reactive<FormRules>({
  ipStart: [
    {
      validator: (rule, value, callback) => {
        if (value === "") {
          callback(new Error("请输入ip"));
        } else if (!IP_REGEX.test(value)) {
          callback(new Error("请输入合法的 IP 地址,例如 192.168.10.208"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    },
    { required: true, message: "ipNums is required" }
  ],
  ipNums: [
    {
      type: "number",
      min: 1,
      max: 20,
      message: "ipNums must be a number [1,20]"
    },
    { required: true, message: "ipNums is required" }
  ],
  port: [
    {
      type: "number",
      min: 1,
      max: 65535,
      message: "port must be a number [1,65535]"
    },
    { required: true, message: "port is required" }
  ],
  connectTimeout: [
    {
      type: "number",
      min: 1,
      max: 65535,
      message: "connectTimeout must be a number [1,65535]"
    },
    { required: true, message: "connectTimeout is required" }
  ],
  responseTimeout: [
    {
      type: "number",
      min: 1,
      max: 65535,
      message: "responseTimeout must be a number [1,65535]"
    },
    { required: true, message: "responseTimeout is required" }
  ],
  maxRetry: [
    {
      type: "number",
      min: 1,
      max: 65535,
      message: "maxRetry must be a number [1,65535]"
    },
    { required: true, message: "maxRetry is required" }
  ],
  heartBeatInterval: [
    {
      type: "number",
      min: 1,
      max: 65535,
      message: "heartBeatInterval must be a number [1,65535]"
    },
    { required: true, message: "heartBeatInterval is required" }
  ]
});
export { ipRules };
