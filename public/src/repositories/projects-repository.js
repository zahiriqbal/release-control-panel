import $ from "jquery";
import q from "q";
import Project from "../models/project";
import BaseRepository from "./base-repository";
import {configRepository} from "./config-repository";

let singleton = Symbol();
let singletonEnforcer = Symbol();

export class ProjectsRepository extends BaseRepository
{
    constructor(enforcer)
    {
        super();

        if (enforcer !== singletonEnforcer)
        {
            throw "Cannot construct singleton";
        }
    }

    static get instance()
    {
        if (!this[singleton])
        {
            this[singleton] = new ProjectsRepository(singletonEnforcer);
        }

        return this[singleton];
    }

    getCurrentVersions()
    {
        let deferred = q.defer();

        let request = $.get(`/current-versions`)
            .done(data =>
            {
                deferred.resolve(data);
            })
            .fail(error =>
            {
                deferred.reject(this.processRequestFailure(error));
            });

        this.safeMonitorRequest(request);

        return deferred.promise;
    }

    getProjects()
    {
        return configRepository.getProjects();
    }

    getUpcomingReleases()
    {
        let deferred = q.defer();
        let projects = this.getProjects().map((p) => p.name);

        let request = $.get(`/releases?timestamp=${+new Date()}`)
            .done(data =>
            {
                let filteredRelases = data.map(r =>
                {
                    r.applications = r.applications.filter(a => projects.indexOf(a.name) !== -1);
                    return r;
                });
                deferred.resolve(filteredRelases);
            })
            .fail(error =>
            {
                deferred.reject(this.processRequestFailure(error));
            });

        this.safeMonitorRequest(request);

        return deferred.promise;
    }
}

export const projectsRepository = ProjectsRepository.instance;