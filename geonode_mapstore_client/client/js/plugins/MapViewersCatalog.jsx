/*
 * Copyright 2023, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import { connect } from 'react-redux';
import { replace } from 'connected-react-router';
import { createSelector } from 'reselect';
import Message from '@mapstore/framework/components/I18N/Message';
import Button from '@js/components/Button';
import FaIcon from '@js/components/FaIcon';
import { getGeoApps } from '@js/api/geonode/v2';
import { getDefaultPluginsConfig } from '@js/api/geonode/config';
import { setControlProperty } from '@mapstore/framework/actions/controls';
import datasetscatalogEpics from '@js/epics/datasetscatalog';
import ResourcesCompactCatalog from '@js/components/ResourcesCompactCatalog';
import ResizableModal from '@mapstore/framework/components/misc/ResizableModal';
import Portal from '@mapstore/framework/components/misc/Portal';
import { setResource as setContextCreatorResource } from '@mapstore/framework/actions/contextcreator';

function MapViewersCatalogPlugin({
    enabled,
    onSetControl,
    match,
    resourcesParams,
    location,
    onReplaceLocation,
    onSetMapViewer,
    ...props
}) {
    const [newViewerModal, setNewViewerModal] = useState('');
    const { pk, mapPk } = resourcesParams || {};
    useEffect(() => {
        if (pk === 'new' && mapPk) {
            setNewViewerModal('select');
        }
    }, [pk, mapPk]);
    return (
        <>
            <Portal>
                <ResizableModal
                    title={<Message msgId={newViewerModal === 'link'
                        ? 'gnviewer.selectLinkedMapViewer'
                        : 'gnviewer.copyConfigurationFromTitle'} />}
                    show={enabled}
                    size="lg"
                    clickOutEnabled={false}
                    onClose={() => {
                        onSetControl(false);
                        setNewViewerModal('');
                    }}
                >
                    <ResourcesCompactCatalog
                        {...props}
                        placeholderId={'gnviewer.mapViewersCatalogFilterPlaceholder'}
                        noResultId={'gnviewer.mapViewersCatalogEntriesNoResults'}
                        onSelect={(resource) => {
                            if (newViewerModal === 'link') {
                                // initialize link workflow and then replace the path
                                // TODO:
                                // finally replace path with the viewer pk
                                onReplaceLocation({
                                    ...location,
                                    pathname: location.pathname.replace('/new/', `/${resource.pk}/`)
                                });
                            } else {
                                getDefaultPluginsConfig()
                                    .then((pluginsConfig) => {
                                        onSetMapViewer({ data: resource.data }, pluginsConfig);
                                    });
                            }
                            onSetControl(false);
                            setNewViewerModal('');
                        }}
                        request={(options) => {
                            return getGeoApps({
                                ...options,
                                'filter{resource_type}': 'mapviewer',
                                ...(pk && pk !== 'new' && { 'filter{-pk}': pk }),
                                ...(newViewerModal !== 'link' && {
                                    'include[]': 'data'
                                })
                            });
                        }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%'
                        }}
                    />
                </ResizableModal>
            </Portal>
            <Portal>
                <ResizableModal
                    title={""}
                    show={newViewerModal === 'select'}
                    clickOutEnabled={false}
                    onClose={null}
                    fitContent
                    modalClassName="gn-new-map-viewer-action"
                >
                    <div className="gn-new-map-viewer-action-wrapper">
                        <div  className="gn-new-map-viewer-action-card">
                            <div>
                                <FaIcon name="link" className="fa-4x"/>
                            </div>
                            <Button variant="primary" onClick={() => {
                                setNewViewerModal('link');
                                onSetControl(true);
                            }}>
                                <Message msgId="gnviewer.linkToViewer" />
                            </Button>
                        </div>
                        <div className="gn-new-map-viewer-action-card">
                            <div >
                                <FaIcon name="cogs" className="fa-4x"/>
                            </div>
                            <Button variant="primary" onClick={() => setNewViewerModal('')}>
                                <Message msgId="gnviewer.createNewViewer" />
                            </Button>
                        </div>
                    </div>

                </ResizableModal>
            </Portal>
        </>
    );
}

const ConnectedMapViewersCatalogPlugin = connect(
    createSelector([
        state => state?.controls?.mapViewersCatalog?.enabled,
        state => state?.gnresource?.params,
        state => state?.router?.location
    ], (enabled, resourcesParams, location) => ({
        enabled,
        resourcesParams,
        location
    })), {
        onSetControl: setControlProperty.bind(null, 'mapViewersCatalog', 'enabled'),
        onReplaceLocation: replace,
        onSetMapViewer: setContextCreatorResource
    }
)(MapViewersCatalogPlugin);

const MapViewersCatalogButton = ({
    onClick,
    size,
    variant
}) => {

    const handleClickButton = () => {
        onClick();
    };

    return (
        <Button
            size={size}
            onClick={handleClickButton}
            variant={variant}
        >
            <Message msgId="gnviewer.copyConfigurationFrom" />
        </Button>
    );
};

const ConnectedMapViewersCatalogButton = connect(
    createSelector([], () => ({})),
    {
        onClick: setControlProperty.bind(null, 'mapViewersCatalog', 'enabled', true)
    }
)((MapViewersCatalogButton));

export default createPlugin('MapViewersCatalog', {
    component: ConnectedMapViewersCatalogPlugin,
    containers: {
        ActionNavbar: {
            name: 'MapViewersCatalog',
            Component: ConnectedMapViewersCatalogButton
        }
    },
    epics: datasetscatalogEpics,
    reducers: {}
});
