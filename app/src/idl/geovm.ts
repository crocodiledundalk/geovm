/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/geovm.json`.
 */
export type Geovm = {
  "address": "2v5V4aVkQnFHojUoY4td6X7E7e5NQ78mKzAjAoA6JBrJ",
  "metadata": {
    "name": "geovm",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createTrixelAndAncestors",
      "discriminator": [
        101,
        175,
        234,
        43,
        17,
        76,
        49,
        255
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "world",
          "writable": true
        },
        {
          "name": "trixel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  120,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "world"
              },
              {
                "kind": "arg",
                "path": "args.id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createTrixelAndAncestorsArgs"
            }
          }
        }
      ]
    },
    {
      "name": "createWorld",
      "discriminator": [
        117,
        96,
        81,
        112,
        15,
        209,
        71,
        63
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "world",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createWorldArgs"
            }
          }
        }
      ]
    },
    {
      "name": "updateTrixel",
      "discriminator": [
        229,
        207,
        215,
        209,
        72,
        78,
        135,
        15
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "world",
          "writable": true,
          "relations": [
            "trixel"
          ]
        },
        {
          "name": "trixel",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  120,
                  101,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "world"
              },
              {
                "kind": "arg",
                "path": "args.id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updateTrixelArgs"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "trixel",
      "discriminator": [
        13,
        30,
        39,
        148,
        167,
        117,
        147,
        155
      ]
    },
    {
      "name": "world",
      "discriminator": [
        145,
        45,
        170,
        174,
        122,
        32,
        155,
        124
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unspecifiedError"
    },
    {
      "code": 6001,
      "name": "invalidArgument"
    },
    {
      "code": 6002,
      "name": "invalidAccount"
    },
    {
      "code": 6003,
      "name": "accountMismatch"
    },
    {
      "code": 6004,
      "name": "unauthorizedAction"
    },
    {
      "code": 6005,
      "name": "invalidResolution"
    },
    {
      "code": 6006,
      "name": "invalidCoordinates"
    },
    {
      "code": 6007,
      "name": "invalidTrixelAccount"
    },
    {
      "code": 6008,
      "name": "invalidTrixelId"
    },
    {
      "code": 6009,
      "name": "arithmeticOverflow"
    }
  ],
  "types": [
    {
      "name": "createTrixelAndAncestorsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "createWorldArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "canonicalResolution",
            "type": "u8"
          },
          {
            "name": "dataType",
            "type": {
              "defined": {
                "name": "trixelDataType"
              }
            }
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "permissionedUpdates",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "sphericalCoords",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ra",
            "type": "f64"
          },
          {
            "name": "dec",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "trixel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "world",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "resolution",
            "type": "u8"
          },
          {
            "name": "updates",
            "type": "u64"
          },
          {
            "name": "lastUpdate",
            "type": "i64"
          },
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "childHashes",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                4
              ]
            }
          },
          {
            "name": "data",
            "type": {
              "defined": {
                "name": "trixelData"
              }
            }
          }
        ]
      }
    },
    {
      "name": "trixelData",
      "docs": [
        "Represents different types of data that can be stored in a trixel"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "count",
            "fields": [
              {
                "name": "count",
                "type": "u32"
              }
            ]
          },
          {
            "name": "aggregateOverwrite",
            "fields": [
              {
                "name": "metric",
                "type": "u64"
              }
            ]
          },
          {
            "name": "aggregateAccumulate",
            "fields": [
              {
                "name": "metric",
                "type": "u64"
              }
            ]
          },
          {
            "name": "meanOverwrite",
            "fields": [
              {
                "name": "numerator",
                "type": "u64"
              },
              {
                "name": "denominator",
                "type": "u64"
              }
            ]
          },
          {
            "name": "meanAccumulate",
            "fields": [
              {
                "name": "numerator",
                "type": "u64"
              },
              {
                "name": "denominator",
                "type": "u64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "trixelDataType",
      "docs": [
        "Represents different types of data that can be stored in a trixel"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "count"
          },
          {
            "name": "aggregateOverwrite"
          },
          {
            "name": "aggregateAccumulate"
          },
          {
            "name": "meanOverwrite"
          },
          {
            "name": "meanAccumulate"
          }
        ]
      }
    },
    {
      "name": "updateTrixelArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "value",
            "type": "i32"
          },
          {
            "name": "coords",
            "type": {
              "option": {
                "defined": {
                  "name": "sphericalCoords"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "world",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "canonicalResolution",
            "type": "u8"
          },
          {
            "name": "permissionedUpdates",
            "type": "bool"
          },
          {
            "name": "updates",
            "type": "u64"
          },
          {
            "name": "rootHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "childHashes",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                8
              ]
            }
          },
          {
            "name": "data",
            "type": {
              "defined": {
                "name": "trixelData"
              }
            }
          }
        ]
      }
    }
  ]
}; 