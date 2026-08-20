import { SHARE } from "./tableGenerate";
import fs from "node:fs";
const v = [
  ...Array.from({ length: 32 }, (_, idex) => {
    return [
      {
        reg_idx: idex,
        bit_offset: 0,
        bit_length: 8,
        bit_name: `BMU${idex + 1}断联位置-正向`,
        bit_value: true,
        bit_value_type: "bit"
      },
      {
        reg_idx: idex,
        bit_offset: 8,
        bit_length: 8,
        bit_name: `BMU${idex + 1}断联位置-反向`,
        bit_value: true,
        bit_value_type: "bit"
      }
    ];
  }),
  ...SHARE.null(388),
  [
    ...Array.from({ length: 16 }, (_, index) => {
      return {
        reg_idx: 0,
        bit_offset: 0,
        bit_length: 1,
        bit_name: `BMU${index + 1}重启标志`,
        bit_mapping: {
          0: "重启初始化完成",
          1: "重启初始化中"
        }
      };
    }),
    ...Array.from({ length: 16 }, (_, index) => {
      return {
        reg_idx: 1,
        bit_offset: 0,
        bit_length: 1,
        bit_name: `BMU${index + 17}重启标志`,
        bit_mapping: {
          0: "重启初始化完成",
          1: "重启初始化中"
        }
      };
    })
  ].flat(),
  ...SHARE.null(154)
];
fs.writeFile("arr", JSON.stringify(v, null, 2), err => {
  if (err) {
    console.error("Error writing file:", err);
  }
});
console.log("v", v);
console.log("v.length", v.length);
