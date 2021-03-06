import React from 'react'
import {
    Entity,
    Editor,
    EditorState,
    RichUtils,
    AtomicBlockUtils,
    ContentState,
    convertToRaw,
    convertFromHTML,
    getSafeBodyFromHTML,
    CompositeDecorator,
    Modifier
} from 'draft-js'

import {
    BUTTON_ITEMS,
    Controlbar,
    blockRenderMap,
    extendedBlockRenderMap,
    MediaBlock,
    mediaBlockRenderer,
    keyBindingFn,
    BeanLinkDialog,
    LinkWrapper,
    PrefaceTextarea
} from '../components'

function myBlockStyleFn(contentBlock) {
    const type = contentBlock.getType();
    if (type === 'code-block') {
        return 'db-code'
    } else if (type == 'blockquote') {
        return 'db-blockquote'
    } else if (type == 'atomic') {
        return 'db-atomic'
    } else {
        return 'db-unstyle'
    }
}

class DoubanEditor extends React.Component {
  constructor(props) {
    super(props)
    const decorator = new CompositeDecorator([
      {
        strategy: findLinkEntities,
        component: LinkWrapper,
      },
    ])

    this.state = {
      editorState: EditorState.createEmpty(decorator),
      title: this.props.title || '',
      showURLInput: false,
      url: '',
      urlType: '',
      prefaceStatus: false,
      summary: this.props.summary || '',
      mentions: [],
      placeholder: this.props.placeholder || ''
    }

    this.focus = () => this.refs.editor.focus()
    this.onChange = (editorState) => this.setState({
      editorState
    })

    this.handleKeyCommand = (command) => this._handleKeyCommand(command)
    this.onTab = (e) => this._onTab(e)
    this.onFocus = (e) => this._onFocus(e)
    this.toggleBlockType = (type) => this._toggleBlockType(type)
    this.toggleInlineStyle = (style) => this._toggleInlineStyle(style)
    this.toggleUploadType = (type) => this._toggleUploadType(type)
    this.onURLChange = (e) => this.setState({
      urlValue: e.target.value
    })

    this.logState = () => {
      const content = this.state.editorState.getCurrentContent()
    }

    this.confirmMedia = this._confirmMedia.bind(this)
    this.onURLInputKeyDown = this._onURLInputKeyDown.bind(this)
  }

  _handleKeyCommand(command) {
    const {editorState} = this.state
    let newState;
    if(command == 'soft-enter') {
        newState = RichUtils.insertSoftNewline(editorState)
    } else {
        newState = RichUtils.handleKeyCommand(editorState, command)
    }

    if (newState) {
        this.onChange(newState)
        return true
    }

    return false
  }

  _onFocus(e) {
    this.setState({
      editorFocused: true
    })
  }

  _onTab(e) {
    const maxDepth = 4
    this.onChange(RichUtils.onTab(e, this.state.editorState, maxDepth))
  }

  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    )
  }

  _toggleUploadType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    )
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    )
  }

  _pictureAppendCallback(blockType, pictures) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    )
  }

  _onURLInputKeyDown(e) {
    if (e.which === 13) {
      this._confirmMedia(e)
    }
  }

  _promptForMedia(type) {
    const {editorState} = this.state
    this.setState({
      showURLInput: true,
      urlValue: '',
      urlType: type,
    }, () => {
      setTimeout(() => {
        this.refs.url.focus()
      }, 0)
    })
  }

  _confirmPictureMedia(pictures) {
    const {editorState} = this.state
    pictures.map(pic => {
      const {editorState} = this.state
      const contentState = editorState.getCurrentContent()
      const newState = contentState.createEntity('image', 'IMMUTABLE', {
        src: pic.thumb,
        file: pic
      })
      this.setState({
        editorState: AtomicBlockUtils.insertAtomicBlock(
          editorState,
          newState.getLastCreatedEntityKey(),
          pic.thumb
        )
      }, () => {
        setTimeout(() => this.focus(), 0)
      })
    })
  }

  insertPicture = (pictures) => {
    this._confirmPictureMedia(pictures)
  }

  insertVideo =(vfile)=> {
      const {editorState} = this.state
      const contentState = editorState.getCurrentContent()
      const newState = contentState.createEntity('video', 'IMMUTABLE', {
          src: vfile.thumb,
          file: vfile
      })
      this.setState({
        editorState: AtomicBlockUtils.insertAtomicBlock(
          editorState,
          newState.getLastCreatedEntityKey(),
          ' '
        )
      }, () => {
        setTimeout(() => this.focus(), 0)
      })
  }

  _confirmMedia(e) {
    e.preventDefault()
    const {editorState, urlValue, urlType} = this.state
    const entityKey = Entity.create(urlType, 'IMMUTABLE', {
      src: urlValue
    })

    this.setState({
      editorState: AtomicBlockUtils.insertAtomicBlock(
        editorState,
        entityKey,
        ' '
      )
    }, () => {
      setTimeout(() => this.focus(), 0)
    })
  }

  showNotification(type, message) {
      if(this.props.showNotification) {
          this.props.showNotification(type, message)
      }
  }

  handleReturn =(e)=> {
      console.log(e)
      e.stopPropagation()
  }

  getEditor() {
    const {editorState} = this.state
    return <Editor
        spellCheck={false}
        editorState={editorState}
        blockRendererFn={mediaBlockRenderer}
        blockStyleFn={myBlockStyleFn}
        blockRenderMap={extendedBlockRenderMap}
        handleKeyCommand={this.handleKeyCommand}
        keyBindingFn={keyBindingFn}
        onChange={this.onChange}
        onTab={this.onTab}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        ref="editor"
        placeholder={this.props.placeholder}
    />
  }

  handleTitleChange = e => {
      this.setState({title: e.target.value})
  }

  insertDashLine =()=> {
      const {editorState} = this.state
      const contentState = editorState.getCurrentContent()
      const newState = contentState.createEntity('dash', 'IMMUTABLE', {})
      this.setState({
        editorState: AtomicBlockUtils.insertAtomicBlock(
          editorState,
          newState.getLastCreatedEntityKey(),
          ' '
        )
      }, () => {
        setTimeout(() => this.focus(), 0)
      })
  }

  toggleLinkDialog =()=> {
      this.refs['bean-link-dialog'].toggleLinkDialog()
  }

  showLinkDialog =()=> {
    const {editorState} = this.state;
    const selection = editorState.getSelection()
    const contentState = editorState.getCurrentContent();
    const startKey = editorState.getSelection().getStartKey();
    const startOffset = editorState.getSelection().getStartOffset();
    const block = contentState.getBlockForKey(selection.getStartKey())
    let link = {}

    if (!selection.isCollapsed()) {
        const blockWithLinkAtBeginning = contentState.getBlockForKey(startKey);
        const linkKey = blockWithLinkAtBeginning.getEntityAt(startOffset);
        let url = '';
        if (linkKey) {
          const linkInstance = contentState.getEntity(linkKey);
          url = linkInstance.getData().url;
        }
        link = {
            text: block.text.slice(selection.anchorOffset, selection.focusOffset),
            link: url,
            disabled: true
        }
    } else{
        if(block.text) {
            link.text = block.text.slice(selection.anchorOffset, selection.focusOffset)
        }
        if(block.link) {
            link.link = block.link
        }
    }
    this.refs['bean-link-dialog'].initLinkDialog(link)
  }

  insertLink =(link)=> {
      const {editorState} = this.state
      const selection = editorState.getSelection()
      const contentState = editorState.getCurrentContent()
      if (!selection.isCollapsed()) {
          const contentStateWithEntity = contentState.createEntity(
            'LINK',
            'MUTABLE',
            {url: link.link}
          )

          const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
          const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity })

          this.setState({
            editorState: RichUtils.toggleLink(
              newEditorState,
              newEditorState.getSelection(),
              entityKey
            )
          }, () => {
            setTimeout(() => this.refs.editor.focus(), 0)
          })
      }else{
          const entityKey = Entity.create('LINK', 'MUTABLE', {url: link.link});
          const textWithEntity = Modifier.insertText(contentState, selection, link.text, null, entityKey);
          this.setState({
              editorState: EditorState.push(editorState, textWithEntity, 'insert-characters')
          }, () => {
              this.focus();
          });
      }
  }


  insertSoftNewLine =()=> {
      const {editorState} = this.state;
      const newState = RichUtils.insertSoftNewline(editorState);
      if(newState) {
          this.onChange(newState)
      }
  }

  insertDashLine =()=> {
      const {editorState} = this.state
      const contentState = editorState.getCurrentContent()
      const newState = contentState.createEntity('dash', 'IMMUTABLE', {})
      this.setState({
        editorState: AtomicBlockUtils.insertAtomicBlock(
          editorState,
          newState.getLastCreatedEntityKey(),
          ' '
        )
      }, () => {
        setTimeout(() => this.focus(), 0)
      })
  }

  showPreface =()=> {

  }

  showSaveDialog =()=> {

  }

  togglePreface =()=> {
      this.refs['bean-preface'].toggle()
  }

  render() {
    return <div className="db-editor">
        <div className="title">
            <input
                type="text"
                placeholder={this.props.titlePlaceholder || ''}
                dir="auto"
                value={this.state.title}
                onChange={this.handleTitleChange}
            />
        </div>
        <PrefaceTextarea ref="bean-preface"/>
        <Controlbar
            toggleInlineStyle={this.toggleInlineStyle}
            toggleBlockType={this.toggleBlockType}
            editorState={this.state.editorState}
            insertPicture={this.insertPicture}
            insertVideo={this.insertVideo}
            insertSoftNewLine={this.insertSoftNewLine}
            insertDashLine={this.insertDashLine}
            showPreface={this.showPreface}
            showSaveDialog={this.showSaveDialog}
            buttonItems={this.props.buttonItems}
            buttonIcons={this.props.buttonIcons}
            toggleLinkDialog={this.toggleLinkDialog}
            showLinkDialog={this.showLinkDialog}
            togglePreface={this.togglePreface}
        />
        <div className="content">
            {this.getEditor()}
        </div>
        <BeanLinkDialog
            ref="bean-link-dialog"
            insertLink={this.insertLink}
        />
    </div>
  }
}


function findLinkEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'LINK'
      )
    },
    callback
  )
}


DoubanEditor.propTypes = {
    buttonItems: React.PropTypes.array,
    buttonIcons: React.PropTypes.object,
}


module.exports = {
  DoubanEditor: DoubanEditor
}
