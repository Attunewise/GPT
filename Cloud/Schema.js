const getSchema = (platform, serverURL) => {
  return {
    "openapi": "3.1.0",
    "info": {
      "title": "Assistant",
      "description": "Provides assistance",
      "version": "v1.0.0"
    },
    "servers": [
      {
        "url": serverURL
      }
    ],
    "paths": {
      "/gpt/queryChatDb": platform !== 'darwin' ? undefined: {
        "post": {
          "operationId": "queryChatDb",
          "summary": "Query the chat.db database on MacOS using the provided sql query to satisfy user's requests regarding their messages",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "query": {
                      "type": "string",
                      "description": "Sql query. *IMPORTANT*: If the `text` column is null the  message content will be in the `attributedBody` column so select both columns pls. All handle id's MUST be *phone numbers in E.164 format* (use the `osascript` function to access Contacts.app to resolve phone numbers of the user's contacts.).\nWhen reporting results resolve phone numbers to contact names if possible."
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/gpt/osascript": platform !== 'darwin' ? undefined: {
        "post": {
          "operationId": "osascript",
          "summary": "Execute a command script. Use this to access the manage the user's contacts, messages, etc or to perform other tasks they request on this Mac. Ensure the target application is installed before using Tell.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "lang": {
                      "type": "string",
                      "enum": [
                        "appleScript",
                        "javaScript"
                      ],
                      "description": "Whether `script` uses apple script or jxa. Defaults to `appleScript`."
                    },
                    "command": {
                      "type": "string",
                      "description": "The script to execute"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/gpt/powershell": platform !== 'win32' ? undefined: {
        "post": {
          "operationId": "powershell",
          "summary": "Execute powershell scripts. Use this to perform tasks on this PC.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "command": {
                      "type": "string",
                      "description": "The powershell script to execute"
                    },
                    "admin": {
                      "type": "boolean",
                      "description": "Whether to request administrator privledge. Defaults to false"
                    },
                  },
                  required: ['command']
                }
              }
            }
          }
        }
      },
      "/gpt/modifyTaskNotes": {
        "post": {
          "operationId": "modifyTaskNotes",
          "summary": "Save or update notes regarding the use of a function for a task that had errors or didn't unfold as expected, in order to avoid the same problem the next time. Note that these are general notes about the task not information about specific instances. Only save such notes after termination of a task.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "upserts": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "description": "id of previous task note if this is an update."
                          },
                          "task": {
                            "type": "string",
                            "description": "Task description: Note this should be a general purpose description of the task without the specific parameters used in the current request."
                          },
                          "functions": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "description": "names of the functions that are applied in this task"
                          },
                          "notes": {
                            "type": "string",
                            "description": "Use this to save salient information you'll need to optimize the task subsequently."
                          },
                          "scope": {
                            "type": "string",
                            "enum": [
                              "allUsers",
                              "currentUser"
                            ],
                            "description": "Whether these notes apply to all users or just the current user. Note for `allUsers` scope the notes must not contain any personally identifiable information"
                          }
                        }
                      }
                    },
                    "deletes": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "ids of the task notes to delete."
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/gpt/searchTaskNotes": {
        "post": {
          "operationId": "searchTaskNotes",
          "summary": "Search for previously saved notes on a task that had errors or didn't unfold as expected. Note that these are general notes about the task not information about specific instances.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "query": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "query"
                  ]
                }
              }
            }
          }
        }
      },
      "/gpt/writeToFiles": {
        "post": {
          "operationId": "writeToFiles",
          "summary": "Write text to one or more files.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "files": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "pathname": {
                            "type": "string",
                            "description": "path name of the file to which text will be written"
                          },
                          "text": {
                            "type": "string",
                            "description": "the text to be written"
                          },
                          "encoding": {
                            "type": "string",
                            "description": "(node.js identifier of) text encoding to use (defaults to utf-8)"
                          },
                          "mode": {
                            "type": "string",
                            "enum": [
                              "overwrite",
                              "append"
                            ],
                            "description": "default is to append to previous contents if any."
                          }
                        },
                        "required": [
                          "pathname",
                          "text"
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/gpt/writeToTerminal": platform !== 'darwin' ? undefined: {
        "post": {
          "operationId": "writeToTerminal",
          "summary": "Write text to the terminal app to execute a specified shell command in the current OS environment. You are permitted to run and even install programs or packages in this environment. The environment is running under the user's account and all their apps are available to you. You have secure access t",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "text": {
                      "type": "string",
                      "description": "The shell command to be executed or terminal input to the currently executing command. You have permission to downloads file to the temp folder. Always create new files in the temp folder unless the user instructs you otherwise. YOU MUST warn the user and get confirmation before executing potentially dangerous or long-running commands. Note that CLI interaction is possible. Don't forget files are case sensitive on Mac."
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/gpt/searchWeb": {
        "post": {
          "operationId": "searchWeb",
          "summary": "Perform a keyword search on the web, which will return summaries for the most relevant results.  *DO NOT rely on such summaries alone to satisfy user requests. You must always confirm with your own knowledge or follow up on the original sources.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "query": {
                      "type": "string",
                      "description": "Search query"
                    },
                    "limit": {
                      "type": "number",
                      "description": "limit to this number of results (default 5)"
                    }
                  },
                  "required": [
                    "query"
                  ]
                }
              }
            }
          }
        }
      },
      "/gpt/searchWebPage": {
        "post": {
          "operationId": "searchWebPage",
          "summary": "Perform a text search on a web page at a given URL.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "document": {
                      "type": "string",
                      "description": "URL of the document within which to search."
                    },
                    "query": {
                      "type": "string",
                      "description": "Search query"
                    },
                    "chunkSize": {
                      "type": "number",
                      "description": "Number of tokens per searchable entity. Defaults to 200."
                    },
                    "limit": {
                      "type": "number",
                      "description": "limit to this number of results (default 3)"
                    }
                  },
                  "required": [
                    "document",
                    "query"
                  ]
                }
              }
            }
          }
        }
      },
      "/gpt/getUserInfo": {
        "post": {
          "operationId": "getUserInfo",
          "summary": "Returns user information including, name, home directory, geo location, time zone, host and OS information, etc",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        }
      },
      "/gpt/fetch": {
        "post": {
          "operationId": "fetch",
          "summary": "Access the Web fetch API",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "resource": {
                      "type": "string",
                      "format": "uri",
                      "description": "the URL of the resource you want to fetch."
                    },
                    "queryParams": {
                      "type": "object",
                      "description": "request parameters."
                    },
                    "method": {
                      "type": "string",
                      "enum": [
                        "GET",
                        "POST",
                        "PUT",
                        "DELETE",
                        "PATCH",
                        "HEAD",
                        "OPTIONS"
                      ],
                      "description": "Contains the request's method (GET, POST, etc.)"
                    },
                    "headers": {
                      "type": "object",
                      "properties": {
                        "authorization": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": {
                        "type": "string"
                      },
                      "description": "Contains the associated Headers object of the request."
                    },
                    "body": {
                      "type": "object",
                      "properties": {
                        "text": {
                          "type": "string"
                        },
                        "json": {
                          "type": "object"
                        },
                        "formData": {
                          "type": "array",
                          "items": {
                            "type": "object"
                          },
                          "description": "Schema for representing multipart form data, where file data is represented by absolute file paths."
                        }
                      }
                    },
                    "mode": {
                      "type": "string",
                      "enum": [
                        "cors",
                        "no-cors",
                        "same-origin",
                        "navigate"
                      ]
                    },
                    "credentials": {
                      "type": "string",
                      "enum": [
                        "omit",
                        "same-origin",
                        "include"
                      ]
                    },
                    "cache": {
                      "type": "string",
                      "enum": [
                        "default",
                        "no-store",
                        "reload",
                        "no-cache",
                        "force-cache",
                        "only-if-cached"
                      ]
                    },
                    "redirect": {
                      "type": "string",
                      "enum": [
                        "follow",
                        "error",
                        "manual"
                      ]
                    },
                    "referrer": {
                      "type": "string"
                    },
                    "referrerPolicy": {
                      "type": "string",
                      "enum": [
                        "no-referrer",
                        "no-referrer-when-downgrade",
                        "origin",
                        "origin-when-cross-origin",
                        "unsafe-url"
                      ]
                    },
                    "integrity": {
                      "type": "string"
                    },
                    "keepalive": {
                      "type": "boolean"
                    },
                    "signal": {
                      "description": "AbortSignal to abort request",
                      "type": "object"
                    }
                  },
                  "additionalProperties": false,
                  "required": [
                    "resource"
                  ]
                }
              }
            }
          }
        }
      },
      "/gpt/open": {
        "post": {
          "operationId": "open",
          "summary": "Opens a file (or a directory or URL), just as if you had double-clicked the file's icon.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "target": {
                      "type": "string",
                      "description": "The target file, directory, or URL to open."
                    }
                  },
                  "required": [
                    "target"
                  ]
                }
              }
            }
          }
        }
      },
      "/gpt/playwright": {
        "post": {
          "operationId": "playwright",
          "summary": "Safely and securely run javascript code with access to a `page` object from playwright.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "target": {
                      "type": "string",
                      "format": "uri",
                      "description": "URL of web page in which to execute the script."
                    },
                    "script": {
                      "type": "string",
                      "description": "The script should be in the form of an async function that accepts a `page` parameter"
                    }
                  },
                  "required": [
                    "target",
                    "script"
                  ]
                }
              }
            }
          }
        }
      },
      "/gpt/awaitEvalJavascript": {
        "post": {
          "operationId": "awaitEvalJavascript",
          "summary": "Safely await async javascript code in the current node.js environment. You may install missing packages as you see fit, with user permission.",
          "x-openai-isConsequential": false,
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "the code to evaluate. Use async code rather than promises. Note that you must explicitly return the result from this code as it will be wrapped in an async thunk. I will catch exceptions and report them back to you."
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "components": {
      "schemas": {}
    }
  }
}

module.exports = { getSchema }
