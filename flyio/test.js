require("dotenv").config();

const config = {
  env: {
    FLY_PROCESS_GROUP: "app",
    PRIMARY_REGION: "mad",
  },
  init: {},
  guest: {
    cpu_kind: "shared",
    cpus: 1,
    memory_mb: 1024,
  },
  metadata: {
    fly_flyctl_version: "0.3.53",
    fly_platform_version: "v2",
    fly_process_group: "app",
    fly_release_id: "wkDoezBKKpMDguQnV77OYqza",
    fly_release_version: "4",
  },
  services: [
    {
      protocol: "tcp",
      internal_port: 2567,
      autostop: true,
      autostart: true,
      min_machines_running: 0,
      ports: [
        {
          port: 80,
          handlers: ["http"],
          force_https: true,
        },
        {
          port: 443,
          handlers: ["http", "tls"],
        },
      ],
      force_instance_key: null,
    },
  ],
  image: "registry.fly.io/game-server-v2:deployment-01JFG5BYH7254MFA3S0QA74WEZ",
  restart: {
    policy: "on-failure",
    max_retries: 10,
  },
};

const baseUrl = "https://api.machines.dev";

const authToken =
  "FlyV1 fm2_lJPECAAAAAAAB/aWxBDALT/c9GRSHJ1xjLvb2dPkwrVodHRwczovL2FwaS5mbHkuaW8vdjGWAJLOAA3Nmx8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDxwlrIZ++i8yUQv6633HjUymBE7RHTssCEdEs7kkFeRb79T7P/YHze2jv34a0BNdvZfnPaDygSXrlUcl2zETgoP+ury8EsdwM9vsBvL5QtfowWevOXlrwIjCjcWrvZ7BcLiPZe9NOu8POPyQ6IWIqdmA/VtMhxKrdn/CE2Ywdr1yjwt5e5lp4Uaub9Iiw2SlAORgc4AV1wDHwWRgqdidWlsZGVyH6J3Zx8BxCDM/Ms4XZ39uOP3r4Uvf9wfe6Ljmf9mAFj2Z95t7KXRRg==,fm2_lJPETgoP+ury8EsdwM9vsBvL5QtfowWevOXlrwIjCjcWrvZ7BcLiPZe9NOu8POPyQ6IWIqdmA/VtMhxKrdn/CE2Ywdr1yjwt5e5lp4Uaub9Ii8QQo8VxxIenGjpD2oUqjGyTL8O5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5nZHJQzmdnFW4XzgANXGsKkc4ADVxrDMQQDlH0tsvKrlsR//1LwS6V18Qg3mwINqGbMXmrtzY8dR8zMqmSRSaCUn0FDdWjRvaiJ4U=";

const appToken =
  "FlyV1 fm2_lJPECAAAAAAAB/aWxBBLyI8HB/XANk/UXFGVhKq0wrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOAA3Nmx8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDyf6CrbWtDoZRg+sYh10MO/YvHTjafqIAdzn1UgoHxHmqrQyCNcBn4pdw6hvKIUi7EFSUpdxJatSqBYtETETlkAQ/NWE19pE51z+YJoBo03h/xJIlgvFX2qRMXTt+KewxlGLrqZXw9GQPrTAwEDpvAX1BY6a2kCp26qf1TpZFtN8quRycUl7KDw4DG1RMQgZYhjNZMElt72/tOy0DaKFVK+mFGUtL8A8RxpiJVW/b0=,fm2_lJPETlkAQ/NWE19pE51z+YJoBo03h/xJIlgvFX2qRMXTt+KewxlGLrqZXw9GQPrTAwEDpvAX1BY6a2kCp26qf1TpZFtN8quRycUl7KDw4DG1RMQQ4KkfWIdpW4OvR50W63HJb8O5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5nZHu6zmdnHtgXzgANXGsKkc4ADVxrDMQQ9raP4DFSpST8mZ3zen5V/MQgXqpe+voDp5Lv61UoMBvKwrvyntdXVYSlqpgPidNf7L8=";

const headers = {
  Authorization: `Bearer ${authToken}`,
  "Content-Type": "application/json",
};

const org_slug = "yassine-elouafi";

async function queryFly(url, method, body, token = authToken) {
  const resp = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  console.log(`${method} ${url}: ${resp.status}-${resp.statusText}`);

  if (!resp.ok) {
    return resp.text();
  }

  return resp.json();
}

async function createNewApp(appName) {
  //
  // Create a new app
  const url = "/v1/apps";

  const body = {
    app_name: appName,
    org_slug: org_slug,
  };

  const resp = await queryFly(url, "POST", body, appToken);

  console.log(resp);
}

async function getApp(app) {
  //
  // Get all apps
  const url = `/v1/apps/${app}`;

  const resp = await queryFly(url, "GET");

  console.log(resp);
}

async function getApps(org) {
  //
  // Get all apps
  const url = `/v1/apps?org_slug=${org}`;

  const resp = await queryFly(url, "GET");

  console.log(resp);
}

async function getMahineData(appName, machineId) {
  //
  // Get machine data
  const url = `/v1/apps/${appName}/machines/${machineId}`;

  const resp = await queryFly(url, "GET");

  console.log(resp);

  return resp;
}

// getMahineData("game-server-v2", "7843d16bd54078");
// getApps(org_slug);
// getApp("game-server-v2");
createNewApp("test-app-7843d16bd54078");
