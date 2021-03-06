import $ from "jquery";
import q from "q";
import Tag from "../models/tag.js";
import BaseRepository from "./base-repository";

let singleton = Symbol();
let singletonEnforcer = Symbol();

export class TagsRepository extends BaseRepository
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
            this[singleton] = new TagsRepository(singletonEnforcer);
        }

        return this[singleton];
    }

    getStableTags(projectName)
    {
        let deferred = q.defer();

        let request = $.get(`/stable-tags?serviceName=${projectName}&timestamp=${+new Date()}`)
            .done(data =>
            {
                deferred.resolve(data.map((tag) => new Tag(tag)));
            })
            .fail(error =>
            {
                deferred.reject(this.processRequestFailure(error));
            });

        this.safeMonitorRequest(request);

        return deferred.promise;
    }

    getTags(projectName)
    {
        let deferred = q.defer();

        let request = $.get(`/tags?serviceName=${projectName}&timestamp=${+new Date()}`)
            .done(data =>
            {
                let tags = data.tags.map((tag) => new Tag(tag));
                let startingTagIndex = data.currentVersion ? tags.findIndex((tag) => { return tag.name == data.currentVersion}) : -1;

                deferred.resolve(
                {
                    tags: tags,
                    startingTagIndex: startingTagIndex
                });
            })
            .fail(error =>
            {
                deferred.reject(this.processRequestFailure(error));
            });

        this.safeMonitorRequest(request);

        return deferred.promise;
    }
}

export const tagsRepository = TagsRepository.instance;