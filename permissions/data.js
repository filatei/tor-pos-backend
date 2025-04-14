const ROLE = {
  ADMIN: "admin", // can see all projects
  BASIC: "basic", // can see and update only your project
  MANAGER: "manager", // can see only your site
  GENERALMANAGER: "generalmanager", // can see all field sites or designated sites
};

const FiELDSITES = [
  "KPANSIA",
  "KPANSIA-E",
  "SWALI",
  "OKUTUKUTU",
  "YENEGWE",
  "OBUNNA",
];

module.exports = { ROLE, FiELDSITES };
