import React from "react";
import ProductsRepository from "../repositories/products-repository";
import ProjectVersionsList from "./project-versions-list.jsx";

export default class UpcomingVersionsList extends React.Component
{
    constructor(props)
    {
        super(props);
        
        this.state =
        {
            commandLineScript: "",
            isLoadingReleases: false,
            releases: [],
            selectedRelease: null,
            selectedReleaseIndex: -1
        };
    }
    
    getCommandLineScript(selectedRelease)
    {
        let applications = selectedRelease ? (selectedRelease.applications || []) : [];
        return applications
            .map(project =>
            {
                let smProjectName = project.name.toUpperCase().replace(/-/g, "_");
                return `sm --restart ${smProjectName} -r ${project.version}`;
            })
            .join(" & ");
    }
    
    componentDidMount()
    {
        this.loadAvailableReleases();
    }
    
    copyCommandLineScript()
    {
        let commandLineScript = document.getElementById("commandLineScript");
        let range = document.createRange();
        range.selectNode(commandLineScript);
        window.getSelection().addRange(range);
        
        try
        {
            document.execCommand("copy");
        }
        catch (ex)
        {
            console.error("Oops - something went wrong.");
        }

        if (window.getSelection)
        {
            if (window.getSelection().empty)// Chrome
            {
                window.getSelection().empty();
            }
            else if (window.getSelection().removeAllRanges)  // Firefox
            {
                window.getSelection().removeAllRanges();
            }
        }
        else if (document.selection) // IE?
        {
            document.selection.empty();
        }
    }
    
    getSelectedReleaseApplications()
    {
        if (!this.state.selectedRelease)
        {
            return [];
        }
        
        return this.state.selectedRelease.applications || [];
    }
    
    handleFormSubmit(event)
    {
        event.preventDefault();

        if (!this.state.selectedRelease)
        {
            return;
        }
        
        if (!this.props.onSearch)
        {
            return;
        }
        
        this.props.onSearch(this.state.selectedRelease);
    }
    
    handleReleaseChange(event)
    {
        var selectedIndex = parseInt(event.target.value);
        var selectedRelease = selectedIndex > -1 ? this.state.releases[selectedIndex] : null;

        this.setState(
        {
            commandLineScript: this.getCommandLineScript(selectedRelease),
            selectedRelease: selectedRelease,
            selectedReleaseIndex: selectedIndex
        });
        
        if (!this.props.onSelectedReleaseChanged)
        {
            return;
        }
        
        this.props.onSelectedReleaseChanged(this.state.selectedRelease);
    }
    
    loadAvailableReleases()
    {
        this.setState(
        {
            isLoadingReleases: true
        });

        ProductsRepository.getUpcomingReleases()
            .then((releases) =>
            {
                this.setState(
                {
                    releases: releases,
                    isLoadingReleases: false
                });
            })
            .catch(() =>
            {
                this.setState(
                {
                    isLoadingReleases: false
                });

                alert("An error has occurred. Could not load releases.");
            });
    }
    
    render()
    {
        return (
            <div>
                <h4>Upcoming versions</h4>
                <form className="form-horizontal" onSubmit={this.handleFormSubmit.bind(this)}>
                    <div className="form-group">
                        <label htmlFor="release" className="col-sm-2 control-label">Release:</label>
                        <div className="col-sm-10">
                            <select id="release" className="form-control" onChange={this.handleReleaseChange.bind(this)} value={this.state.selectedReleaseIndex}>
                                <option value="-1"> </option>
                                {
                                    this.state.releases.map((release, index) =>
                                    {
                                        return (
                                            <option key={index} value={index}>{release.name}</option>
                                        );
                                    })
                                }
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="col-sm-offset-2 col-sm-10">
                            {
                                (() =>
                                {
                                    if (!this.state.isLoadingReleases && this.state.selectedRelease)
                                    {
                                        return (
                                            <div className="input-group">
                                                <span className="input-group-btn">
                                                    <button className="btn btn-primary">Search</button>
                                                    <button className="btn btn-default" onClick={this.copyCommandLineScript.bind(this)} type="button">Copy 'sm' start script</button>
                                                </span>
                                                <input id="commandLineScript" className="form-control" readOnly="true" value={this.state.commandLineScript} type="text" />
                                            </div>
                                        );
                                    }
                                    else
                                    {
                                        return <button className="btn btn-primary">Search</button>;
                                    }
                                })()
                            }
                        </div>
                    </div>
                </form>
                <ProjectVersionsList isLoading={this.state.isLoadingReleases} projects={this.getSelectedReleaseApplications()} />
            </div>
        );
    }
}