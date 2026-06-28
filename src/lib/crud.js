import { rmAdminApi } from './http.js';

async function rmAdminApiCrud(method, path, body) {
  return rmAdminApi(path, { method, body });
}

export const rmAdminDomain = {
  // Editions
  createEdition: (p)    => rmAdminApiCrud('POST', '/editions', p),
  updateEdition: (id,p) => rmAdminApiCrud('PUT', `/editions/${id}`, p),
  // Tournaments (categories within edition)
  createTournament: (p)    => rmAdminApiCrud('POST', '/tournaments', p),
  updateTournament: (id,p) => rmAdminApiCrud('PUT', `/tournaments/${id}`, p),
  deleteTournament: (id)   => rmAdminApiCrud('DELETE', `/tournaments/${id}`),
  // Groups (per tournament)
  createGroup: (p)    => rmAdminApiCrud('POST', '/groups', p),
  updateGroup: (id,p) => rmAdminApiCrud('PUT', `/groups/${id}`, p),
  deleteGroup: (id)   => rmAdminApiCrud('DELETE', `/groups/${id}`),
  // Teams
  createTeam: (p)     => rmAdminApiCrud('POST', '/teams', p),
  updateTeam: (id,p)  => rmAdminApiCrud('PUT', `/teams/${id}`, p),
  deleteTeam: (id)    => rmAdminApiCrud('DELETE', `/teams/${id}`),
  // Registrations (per tournament)
  upsertRegistration: (p)    => rmAdminApiCrud('POST', '/registrations', p),
  updateRegistration: (id,p) => rmAdminApiCrud('PUT', `/registrations/${id}`, p),
  deleteRegistration: (id)   => rmAdminApiCrud('DELETE', `/registrations/${id}`),
  // Matches (per tournament)
  createMatch: (p)    => rmAdminApiCrud('POST', '/matches', p),
  updateMatch: (id,p) => rmAdminApiCrud('PUT', `/matches/${id}`, p),
  deleteMatch: (id)   => rmAdminApiCrud('DELETE', `/matches/${id}`),
  // Match events
  createMatchEvent: (p)    => rmAdminApiCrud('POST', '/match-events', p),
  updateMatchEvent: (id,p) => rmAdminApiCrud('PUT',  `/match-events/${id}`, p),
  deleteMatchEvent: (id)   => rmAdminApiCrud('DELETE', `/match-events/${id}`),
  // Live (per tournament)
  updateLive: (p) => rmAdminApiCrud('PUT', '/live', p),
  // Scorers (per tournament)
  createScorer: (p)    => rmAdminApiCrud('POST', '/scorers', p),
  updateScorer: (id,p) => rmAdminApiCrud('PUT', `/scorers/${id}`, p),
  deleteScorer: (id)   => rmAdminApiCrud('DELETE', `/scorers/${id}`),
  // Knockout ties (tabellone qualificazione, per tournament)
  createKnockoutTie: (p)    => rmAdminApiCrud('POST', '/knockout-ties', p),
  updateKnockoutTie: (id,p) => rmAdminApiCrud('PUT', `/knockout-ties/${id}`, p),
  deleteKnockoutTie: (id)   => rmAdminApiCrud('DELETE', `/knockout-ties/${id}`),
  // Edition-level content
  createNews: (p)    => rmAdminApiCrud('POST', '/news', p),
  updateNews: (id,p) => rmAdminApiCrud('PUT', `/news/${id}`, p),
  deleteNews: (id)   => rmAdminApiCrud('DELETE', `/news/${id}`),
  createEvent: (p)    => rmAdminApiCrud('POST', '/events', p),
  updateEvent: (id,p) => rmAdminApiCrud('PUT', `/events/${id}`, p),
  deleteEvent: (id)   => rmAdminApiCrud('DELETE', `/events/${id}`),
  createHonor: (p)    => rmAdminApiCrud('POST', '/honors', p),
  updateHonor: (id,p) => rmAdminApiCrud('PUT', `/honors/${id}`, p),
  deleteHonor: (id)   => rmAdminApiCrud('DELETE', `/honors/${id}`),
  createSponsor: (p)    => rmAdminApiCrud('POST', '/sponsors', p),
  updateSponsor: (id,p) => rmAdminApiCrud('PUT', `/sponsors/${id}`, p),
  deleteSponsor: (id)   => rmAdminApiCrud('DELETE', `/sponsors/${id}`),
  createStrip: (p)    => rmAdminApiCrud('POST', '/strip', p),
  updateStrip: (id,p) => rmAdminApiCrud('PUT', `/strip/${id}`, p),
  deleteStrip: (id)   => rmAdminApiCrud('DELETE', `/strip/${id}`),
};
