/*
 * Copyright 2021, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import isArray from 'lodash/isArray';
import uniqBy from 'lodash/uniqBy';
import Viewer from './Viewer';
import {
    contextMonitoredStateSelector,
    currentPluginsSelector,
    contextThemeSelector,
    contextCustomVariablesEnabledSelector
} from '@mapstore/framework/selectors/context';
import { canEditResource } from '@js/selectors/resource';
import ContextTheme from '@mapstore/framework/components/theme/ContextTheme';
import { getConfigProp } from '@mapstore/framework/utils/ConfigUtils';
import { getGeoNodeConfig } from '@js/utils/APIUtils';
import { ResourceTypes } from '@js/utils/ResourceUtils';

import defaultThemeVars from "!!raw-loader!../../themes/geonode/less/_variables.less";
const DEFAULT_PLUGINS_CONFIG = [];

function getPluginsConfiguration(name, pluginsConfig) {
    if (!pluginsConfig) {
        return DEFAULT_PLUGINS_CONFIG;
    }
    if (isArray(pluginsConfig)) {
        return pluginsConfig;
    }
    const { isMobile } = getConfigProp('geoNodeSettings') || {};
    if (isMobile && pluginsConfig) {
        return pluginsConfig[`${name}_mobile`] || pluginsConfig[name] || DEFAULT_PLUGINS_CONFIG;
    }
    return pluginsConfig[name] || DEFAULT_PLUGINS_CONFIG;
}

function MapViewerRoute({
    name,
    pluginsConfig: propPluginsConfig,
    viewerPluginsConfig,
    theme,
    customVariablesEnabled,
    canEdit,
    embed,
    resource,
    hasViewer,
    ...props
}) {

    const { pk, actionType } = props?.match?.params || {};
    const editing = canEdit && actionType !== 'preview';
    const pluginsConfig = hasViewer === true
        ? embed
            ? getPluginsConfiguration('desktop', viewerPluginsConfig)
            : (resource?.pk === pk || pk === 'new')
                ? uniqBy([
                    ...getPluginsConfiguration(name, propPluginsConfig)
                        .filter((plugin) => !editing ? !!plugin.mandatory : true),
                    ...((viewerPluginsConfig)
                        ? getPluginsConfiguration('desktop', viewerPluginsConfig)
                        : [])
                ], 'name')
                : []
        : hasViewer === false
            ? getPluginsConfiguration(name, propPluginsConfig)
            : [];
    return (<>
        <ContextTheme
            theme={{
                ...theme,
                variables: Object.keys(theme?.variables || {}).reduce((acc, key) => {
                    return {
                        ...acc,
                        [key.replace('ms-', 'gn-')]: theme.variables[key]
                    };
                }, {})
            }}
            customVariablesEnabled={customVariablesEnabled}
            lessCssInput={defaultThemeVars + ".get-root-css-variables(@gn-theme-vars);"}
        />
        <Viewer
            name={name}
            pluginsConfig={pluginsConfig}
            {...props}
        />
    </>);
}

const ConnectedMapViewerRoute = connect(
    createSelector([
        currentPluginsSelector,
        contextMonitoredStateSelector,
        contextThemeSelector,
        contextCustomVariablesEnabledSelector,
        canEditResource,
        state => state?.gnresource?.data,
        state => state?.gnresource?.params?.hasViewer,
        state => state?.gnresource?.loadingResourceConfig,
        state => state?.gnresource?.configError
    ], (viewerPluginsConfig, viewerMonitoredState, theme, customVariablesEnabled, canEdit, resource, hasViewer, loadingConfig, configError) => ({
        viewerPluginsConfig,
        viewerMonitoredState,
        theme,
        customVariablesEnabled,
        canEdit,
        resource,
        hasViewer,
        loadingConfig,
        configError
    })),
    {}
)(MapViewerRoute);

ConnectedMapViewerRoute.displayName = 'ConnectedMapViewerRoute';

const SwitchViewer = (props) => {
    // the page inject the resource type only for embed layers
    const pageResourceType = getGeoNodeConfig('resourceType');
    const { pk } = props?.match?.params || {};
    const ViewerComponent = pk === 'new' || (!!pageResourceType && pageResourceType !== ResourceTypes.MAP)
        ? Viewer
        : ConnectedMapViewerRoute;
    return <ViewerComponent embed={!!pageResourceType} {...props}/>;
};

export default SwitchViewer;
