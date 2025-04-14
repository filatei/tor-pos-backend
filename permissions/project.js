const { ROLE, FIELDSITES } = require("./data");

function canViewProject(user, project) {
  //  if your project, or you are admin or you are manager and project is in your site or
  // you are general manager and project is in field site, view it
  return (
    user.role === ROLE.ADMIN ||
    (user.role === ROLE.GENERALMANAGER && FIELDSITES.includes(project.site)) ||
    (user.role === ROLE.MANAGER && project.site == user.site) ||
    project.creator === user.userId
  );
}

function scopedProjects(user, projects) {
  if (user.role === ROLE.ADMIN) return projects;
  return projects.filter((project) => project.creator === user.userId);
}

function canDeleteProject(user, project) {
  return project.creator === user.userId;
}

module.exports = {
  canViewProject,
  scopedProjects,
  canDeleteProject,
};
