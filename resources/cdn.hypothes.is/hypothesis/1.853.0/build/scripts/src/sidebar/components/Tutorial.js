import { SvgIcon } from '@hypothesis/frontend-shared';

import { isThirdPartyService } from '../helpers/is-third-party-service';
import { withServices } from '../service-context';

/**
 * Subcomponent: an "instruction" within the tutorial step that includes an
 * icon and a "command" associated with that icon. Encapsulating these together
 * allows for styling to keep them from having a line break between them.
 *
 * @param {object} props
 *   @param {string} props.commandName - Name of the "command" the instruction represents
 *   @param {string} props.iconName - Name of the icon to display
 */
function TutorialInstruction({ commandName, iconName }) {
  return (
    <span className="Tutorial__instruction">
      <SvgIcon name={iconName} inline={true} className="Tutorial__icon" />
      <em>{commandName}</em>
    </span>
  );
}

/**
 * Tutorial for using the sidebar app
 */
function Tutorial({ settings }) {
  const canCreatePrivateGroups = !isThirdPartyService(settings);
  return (
    <ol className="Tutorial__list">
      <li className="Tutorial__item">
        To create an annotation, select text and then select the{' '}
        <TutorialInstruction iconName="annotate" commandName="Annotate" />{' '}
        button.
      </li>
      <li className="Tutorial__item">
        To create a highlight (
        <a
          href="https://web.hypothes.is/help/why-are-highlights-private-by-default/"
          target="_blank"
          rel="noopener noreferrer"
        >
          visible only to you
        </a>
        ), select text and then select the{' '}
        <TutorialInstruction iconName="highlight" commandName="Highlight" />{' '}
        button.
      </li>
      {canCreatePrivateGroups && (
        <li className="Tutorial__item">
          To annotate in a private group, select the group from the groups
          dropdown. Don&apos;t see your group? Ask the group creator to send a{' '}
          <a
            href="https://web.hypothes.is/help/how-to-join-a-private-group/"
            target="_blank"
            rel="noopener noreferrer"
          >
            join link
          </a>
          ).
        </li>
      )}
      <li className="Tutorial__item">
        To reply to an annotation, select the{' '}
        <TutorialInstruction iconName="reply" commandName="Reply" /> button.
      </li>
    </ol>
  );
}

export default withServices(Tutorial, ['settings']);
