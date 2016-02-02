"use strict";

const config = require("../config");
const exec = require("child_process").exec;
const path = require("path");
const q = require("q");
const request = require("request");
const workspace = process.env.WORKSPACE;

class StoriesRepository
{
    static getStories(projectsAndTags)
    {
        return this.getStoryNumbersFromGitLogs(projectsAndTags).then(jiraNumbers => this.getStoriesBetweenTagsForProjects(projectsAndTags, jiraNumbers));
    }

    static getStoryNumbersFromGitLogs(projectsAndTags)
    {
        let promises = projectsAndTags.map(project => this.getStoryNumbersFromProjectGitLog(project));
        return q.all(promises).then(results =>
        {
            return results.reduce((left, right) => left.concat(right), [])
        });
    }

    static getStoryNumbersFromProjectGitLog(project)
    {
        let deferred = q.defer();

        let serviceCmdOptions = {cwd: path.join(workspace, project.name)};
        let startTag = project.tags[project.tags.length - 1];
        let endTag = project.tags[0];
        let command = `git log --date-order --pretty=format:"%s----__-----%h----__-----%aI----__-----%an" release/${startTag}...release/${endTag} | grep -v "Merge" | sort`;
        exec(command, serviceCmdOptions, function (error, stdout)
        {
            if (error)
            {
                deferred.reject(error);
                return;
            }

            let jiraNumbers = stdout.split("\n")
                .map(line =>
                {
                    let numbers = [];
                    let regex = /[A-Z]+[-_]\d+/gi;
                    if (regex.test(line))
                    {
                        regex.lastIndex = 0;
                        var result;
                        while (result = regex.exec(line))
                        {
                            numbers.push(result[0]);
                        }
                    }
                    return numbers;
                })
                .reduce((left, right) => left.concat(right), []);

            deferred.resolve(jiraNumbers);
        });

        return deferred.promise;
    }

    static getStoriesBetweenTagsForProjects(projectsAndTags, jiraNumbers)
    {
        let deferred = q.defer();
        let requestOptions = {
            method: "GET",
            url: `${config.jiraUrl}/rest/api/2/search`,
            auth: {
                user: config.username,
                pass: config.password
            },
            qs: {
                jql: this.prepareJQLForTags(projectsAndTags, jiraNumbers),
                maxResults: 99999
            },
            headers: {
                "Content-Type": "application/json"
            }
        };
        let responseHandler = (error, response, data) =>
        {
            if (error)
            {
                deferred.reject(error);
                return;
            }

            let parsedData = JSON.parse(data);
            if (!parsedData.issues)
            {
                deferred.reject();
                return;
            }

            let jiraStories = parsedData.issues.map(issue =>
            {
                return {
                    ticketNumber: issue.key,
                    message: issue.fields.summary,
                    dateTime: issue.fields.updated,
                    author: issue.fields.creator.displayName,
                    status: issue.fields.status.name,
                    url: `${config.jiraUrl}/browse/${issue.key}`,
                    gitTags: issue.fields.customfield_10900
                };
            });

            deferred.resolve(jiraStories);
        };

        request(requestOptions, responseHandler);

        return deferred.promise;
    }

    static prepareJQLForTags(projectsAndTags, jiraNumbers)
    {
        const separator = ", ";

        let gitTags = projectsAndTags
            .filter(project => project.tags.length)
            .map(projectAndTags => projectAndTags.tags.map(tag => projectAndTags.name + "-" + tag).join(separator))
            .join(separator);
        
        if (jiraNumbers.length > 0)
        {
            let jiraNumbersString = jiraNumbers.join(separator);
            return `project = "Company Accounts Tax Online" AND ("Git Tag" in (${gitTags}) OR Key in (${jiraNumbersString})) ORDER BY status ASC, team ASC, key DESC`;
        }
        else
        {
            return `project = "Company Accounts Tax Online" AND "Git Tag" in (${gitTags}) ORDER BY status ASC, team ASC, key DESC`;
        }
    }
}

module.exports = StoriesRepository;