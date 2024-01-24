/*
 * Copyright 2020, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { createPlugin } from '@mapstore/framework/utils/PluginsUtils';
import Message from '@mapstore/framework/components/I18N/Message';
import { Glyphicon } from 'react-bootstrap';
import { mapInfoSelector } from '@mapstore/framework/selectors/map';
import Loader from '@mapstore/framework/components/misc/Loader';
import Button from '@js/components/Button';
import Spinner from '@js/components/Spinner';
import { isLoggedIn } from '@mapstore/framework/selectors/security';
import controls from '@mapstore/framework/reducers/controls';
import gnresource from '@js/reducers/gnresource';
import gnsave from '@js/reducers/gnsave';
import gnsaveEpics from '@js/epics/gnsave';
import { saveDirectContent } from '@js/actions/gnsave';
import {
    isNewResource,
    canEditResource,
    getResourceDirtyState
} from '@js/selectors/resource';
import { getCurrentResourcePermissionsLoading } from '@js/selectors/resourceservice';
import { withRouter, Prompt } from 'react-router';
import { getMessageById } from '@mapstore/framework/utils/LocaleUtils';

function Save(props) {
    return props.saving ? (<div
        style={{ position: 'absolute', width: '100%',
            height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.75)',
            top: '0px', zIndex: 2000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', right: '0px'}}>
        <Loader size={150}/>
    </div>) : null;
}

const SavePlugin = connect(
    createSelector([
        state => state?.gnsave?.saving
    ], (saving) => ({
        saving
    }))
)(Save);

function SaveButton({
    enabled,
    onClick,
    variant,
    size,
    loading,
    className,
    dirtyState: dirtyStateProp
}, { messages }) {

    const dirtyState = useRef();
    dirtyState.current = dirtyStateProp;
    useEffect(() => {

        function onBeforeUnload(event) {
            if (dirtyState.current) {
                (event || window.event).returnValue = null;
            }
        }
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, []);

    return enabled
        ? <><Button
            variant={dirtyStateProp ? 'warning' : (variant || "primary")}
            size={size}
            onClick={() => onClick()}
            disabled={loading}
            className={className}
        >
            <Message msgId="save"/>{' '}{loading && <Spinner />}
        </Button>
        <Prompt
            when={!!dirtyStateProp}
            message={(/* nextLocation, action */) => {
                const confirmed = window.confirm(getMessageById(messages, 'gnviewer.prompPendingChanges')); // eslint-disable-line no-alert
                // if confirm the path should be the next one
                if (confirmed) {
                    return true;
                }
                // currently it's not possible to replace the pathname
                // without side effect
                // such as reloading of the page
                return false;
            }}
        />
        </>
        : null
    ;
}

SaveButton.contextTypes = {
    messages: PropTypes.object
};

const ConnectedSaveButton = connect(
    createSelector(
        isLoggedIn,
        isNewResource,
        canEditResource,
        mapInfoSelector,
        getCurrentResourcePermissionsLoading,
        getResourceDirtyState,
        (loggedIn, isNew, canEdit, mapInfo, permissionsLoading, dirtyState) => ({
            // we should add permList to map pages too
            // currently the canEdit is located inside the map info
            enabled: loggedIn && !isNew && (canEdit || mapInfo?.canEdit),
            loading: permissionsLoading,
            dirtyState
        })
    ),
    {
        onClick: saveDirectContent
    }
)((withRouter(SaveButton)));

export default createPlugin('Save', {
    component: SavePlugin,
    containers: {
        BurgerMenu: {
            name: 'save',
            position: 30,
            text: <Message msgId="save"/>,
            icon: <Glyphicon glyph="floppy-open"/>,
            action: saveDirectContent,
            selector: createSelector(
                isLoggedIn,
                isNewResource,
                canEditResource,
                mapInfoSelector,
                (loggedIn, isNew, canEdit, mapInfo) => ({
                    // we should add permList to map pages too
                    // currently the canEdit is located inside the map info
                    style: loggedIn && !isNew && (canEdit || mapInfo?.canEdit) ? {} : { display: 'none' }
                })
            )
        },
        ActionNavbar: {
            name: 'Save',
            Component: ConnectedSaveButton
        }
    },
    epics: {
        ...gnsaveEpics
    },
    reducers: {
        gnresource,
        gnsave,
        controls
    }
});
