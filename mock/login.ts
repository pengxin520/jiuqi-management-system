import { defineFakeRoute } from "vite-plugin-fake-server/client";

export default defineFakeRoute([
  {
    url: "/login",
    method: "post",
    response: ({ body }) => {
      if (body.username === "master" && body.password === "KSJQ0708") {
        return {
          success: true,
          data: {
            avatar: "",
            username: "master",
            nickname: "",
            roles: ["master"],
            permissions: ["*:*:*"],
            accessToken: "eyJhbGciOiJIUzUxMiJ9.master",
            refreshToken: "eyJhbGciOiJIUzUxMiJ9.masterRefresh",
            expires: "2030/10/30 00:00:00"
          }
        };
      }

      if (body.username === "admin" && body.password === "KSJQ1234") {
        return {
          success: true,
          data: {
            avatar: "",
            username: "admin",
            nickname: "admin",
            roles: ["admin"],
            permissions: [],
            accessToken: "eyJhbGciOiJIUzUxMiJ9.admin",
            refreshToken: "eyJhbGciOiJIUzUxMiJ9.adminRefresh",
            expires: "2030/10/30 00:00:00"
          }
        };
      }

      return {
        success: false,
        data: null
      };
    }
  }
]);
