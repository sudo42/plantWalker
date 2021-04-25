window.addEventListener('DOMContentLoaded', evt => {
  init()
})

const _ = {
  C: (e, c=[], a={}, s={}) => {
    let el = document.createElement(e)
    if (c && !Array.isArray(c)) c = [c]
    if (c) c.forEach(cls=>el.classList.add(cls))
    if (a) Object.entries(a).forEach(([k,v])=>el.setAttribute(k, v))
    if (s) Object.entries(s).forEach(([k,v])=>el.style.setProperty(k,v))
    return el
  },
  R: excl=> Math.floor(Math.random() * excl),
  E: (name, data=null, eventInit=undefined) => {
    let evt = new Event(name, eventInit)
    evt.data = data
    return evt
  },
  P: (len, ch) => {
    return num => {
      let str = `${num}`
      let add = len - str.length
      if (add > 0) {
        str = `${ch.repeat(add)}${str}`
      }
      return str
    }
  }
}

function init() {
  const EL = {
    ROOT: document.querySelector(':root'),

    // gen bar
    inSizeX: document.getElementById('inSizeX'),
    inSizeY: document.getElementById('inSizeY'),
    inFlowerCount: document.getElementById('inFlowerCount'),
    btnGenNew: document.getElementById('genNewGame'),
    compSize: document.getElementById('compCellCount'),

    // game area
    gameArea: document.getElementById('gameSection'),
    gameFieldWrap: document.querySelector('.fieldWrap'),
    countFlowers: document.querySelector('.counter.flowers .number'),
    countFlags: document.querySelector('.counter.flags .number'),
    countClicks: document.querySelector('.counter.clicks .number'),
    countExplored: document.querySelector('.counter.explored .number'),
    timePlayTime: document.querySelector('.timer.playTime .time'),
  }

  let currentGame = null

  const _default = (el, value) => {
    let now = el.value
    if (now.trim() === '')
      el.value = value
  }

  const _readGameSize = () => {
    let sizeX = Number.parseInt(EL.inSizeX.value),
        sizeY = Number.parseInt(EL.inSizeY.value)
    let cellCount = sizeX * sizeY
    if (Number.isInteger(cellCount) && cellCount > 0)
      return { sizeX, sizeY, cellCount }
    return null
  }
  const _readFlowerCount = () => {
    let flowerCount = Number.parseInt(EL.inFlowerCount.value)
    if (Number.isInteger(flowerCount) && flowerCount >= 0) return flowerCount
    return NaN
  }

  const _updateForm = () => {
    let size = _readGameSize()
    EL.compSize.innerText = size ? `${size.cellCount}` : '?'
    let flowers = _readFlowerCount()

    let thisIsFine = size && flowers >= 0 && size.cellCount >= flowers
    if (thisIsFine) {
      EL.btnGenNew.innerText = 'generate'
      EL.btnGenNew.disabled = false
      EL.btnGenNew.classList.remove('errors')
    } else {
      EL.btnGenNew.innerText = 'nope …'
      EL.btnGenNew.disabled = true
      EL.btnGenNew.classList.add('errors')
    }
    return thisIsFine ? { size, flowers } : false
  }

  const _newGame = () => {
    let vals = _updateForm()
    if (!vals) console.error('can not generate new game ... bad values were supplied!')

    if (currentGame)
      currentGame.stop()

    let _n2 = _.P(2,'0'),
        _n3 = _.P(3,'0')

    let field = generateField({
      sizeX: vals.size.sizeX,
      sizeY: vals.size.sizeY,
      flowerCount: vals.flowers,
    })

    let startTime = null
    let timer = null
    let ended = false

    const _stop = (showAll=false) => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
      ended = true
      field.control.endNow(showAll)
    }

    const _genEndMsg = success => {
      let endMsgWrap = _.C('div', ['endMsg', success?'win':'gameOver'])
      let endMsg = _.C('div', 'endMsgText')
      endMsg.innerText = success ? 'You win! \\o/' : 'oh no … \na flower was broken'
      endMsgWrap.appendChild(endMsg)
      return endMsgWrap
    }
    const _gameOver = () => {
      if (ended) return false
      ended = true
      console.debug('oh no ... this is the end ):')
      _stop(true)
      EL.gameFieldWrap.appendChild(_genEndMsg(false))
      //TODO: do sth fancy
    }
    const _playerWins = () => {
      if (ended) return false
      ended = true
      console.debug('you won! hooray! \\o/')
      _stop(true)
      EL.gameFieldWrap.appendChild(_genEndMsg(true))
      //TODO: do sth fancy
    }

    // start timer with first click ...
    field.addEventListener('firstClicked', e => {
      startTime = Date.now()
      timer = setInterval(()=>{
        let diff = Date.now() - startTime
        let hours = Math.floor(diff / (60*60*1000)),
            mins = Math.floor((diff % (60*60*1000)) / (60*1000)),
            secs = Math.floor((diff % (60*1000)) / 1000)
        let _str = v=> v<10?`0${v}`:`${v}`
        EL.timePlayTime.innerText = `${hours?`${hours}:`:''}${_str(mins)}:${_str(secs)}`
        EL.timePlayTime.dateTime = `PT${hours?`${hours}H`:''}${mins}M${secs}S`
      }, 500)
    })
    field.addEventListener('steppedOnFlower', e => {
      console.debug('someone stepped on a flower ... it is broken now ):')
      _gameOver()
      // TODO: maybe integrate "plant revival mode", where plants won't die and the player can continue
    })
    field.addEventListener('exploredCountChanged', e=> {
      EL.countExplored.innerText = _n3(e.data.exploredCount)
      let data = field.data
      if (data.cellCount <= data.exploredCount + data.flowerCount) {
        _playerWins()
      }
    })
    field.addEventListener('flagCountChanged', e=> EL.countFlags.innerText = _n3(e.data.flagCount))
    field.addEventListener('clickCountChanged', e=> EL.countClicks.innerText = _n3(e.data.clickCount))

    EL.gameFieldWrap.replaceChildren(field.field)
    EL.countFlowers.innerText = _n3(field.data.flowerCount)
    EL.countFlags.innerText = _n3(field.data.flagCount)
    EL.countExplored.innerText = _n3(field.data.exploredCount)
    EL.countClicks.innerText = _n3(field.data.clickCount)
    EL.timePlayTime.innerText = '00:00'
    EL.timePlayTime.dateTime = 'PT0S'

    EL.ROOT.classList.add('gameVisible')

    currentGame = {
      stop: () => _stop(false)
    }
  }

  /* add listeners */
  [EL.inSizeX,EL.inSizeY,EL.inFlowerCount].forEach(inp=>{
    inp.addEventListener('input', _updateForm)
    inp.addEventListener('change', _updateForm)
  })

  EL.btnGenNew.addEventListener('click', evt=>{
    evt.preventDefault()
    evt.stopPropagation()

    _newGame()
  })

  /* init */
  _default(EL.inSizeX, 30)
  _default(EL.inSizeY, 16)
  _default(EL.inFlowerCount, 42)

  _updateForm()

}

function generateField({sizeX, sizeY, flowerCount=0}) {
  console.debug('generateField called', {sizeX, sizeY, flowerCount})
  if (!(Number.isInteger(sizeX) && sizeX > 0 && Number.isInteger(sizeY) && sizeY > 0))
    return console.error('dimensions have to be positive integers and > 0', {sizeX, sizeY})
  if (!(flowerCount >= 0 && Number.isInteger(flowerCount)))
    return console.error('flower count has to be a positive integer')

  const cellCount = sizeX * sizeY
  if (flowerCount > cellCount)
    return console.error('too many flowers!')

  let eField = _.C('div', 'field', {}, { '--size-x': sizeX, '--size-y': sizeY })
  let allCells = []
  let cells = []
  let allCellData = []
  let cellData = []
  let flowersGenerated = false
  let exploredCount = 0
  let flagCount = 0
  let clickCount = 0
  const publicEventTarget = new EventTarget()

  /* EXPORTABLE PROPERTIES */
  const fieldData = {
    get sizeX() { return sizeX },
    get sizeY() { return sizeY },
    get cellCount() { return cellCount },
    get flowerCount() { return flowerCount },
    get exploredCount() { return exploredCount },
    get flagCount() { return flagCount },
    get clickCount() { return clickCount },
  }

  /* FIELD LOGIC */
  const _addFlag = cell => {
    if (cell.flag || cell.explored) return cell.flag
    cell.flag = true
    flagCount++
    cell.cell.classList.add('flag')
    publicEventTarget.dispatchEvent(_.E('flagCountChanged', { flagCount }))
  }
  const _removeFlag = cell => {
    if (!cell.flag || cell.explored) return !cell.flag
    cell.flag = false
    flagCount--
    cell.cell.classList.remove('flag')
    publicEventTarget.dispatchEvent(_.E('flagCountChanged', { flagCount }))
  }
  const _get8 = cell => {
    let { x, y } = cell
    return [
      [x-1,y+1], [x+0,y+1], [x+1,y+1],
      [x-1,y+0],            [x+1,y+0],
      [x-1,y-1], [x+0,y-1], [x+1,y-1],
    ]
      .filter(([x,y])=> x >= 0 && x < sizeX && y >= 0 && y < sizeY )
      .map(([x,y])=>cellData[x][y])
  }
  const _computeAndSetAdjacentCount = cell => {
    if (!(cell.adjacentComputed || cell.flower)) {
      let adj = _get8(cell)
      let count = adj.filter(c => c.flower).length;
      cell.setCount(count)
    }
  }
  const _exploreCellSafe = cell => { // does magic, but won't step on flowers or remove flags
    if (cell.explored || cell.flower || cell.flag) return !cell.flower;
    _computeAndSetAdjacentCount(cell)
    cell.explored = true
    cell.cell.classList.add('explored')
    exploredCount++
    return true;
  }
  const _explorationPropagation = startCell => { // let's see how far we can walk before we hit numbers!
    startCell.propMark = true
    const q = [startCell]
    while (q.length) {
      let cell = q.shift()
      let safe = _exploreCellSafe(cell)
      if (!safe || cell.adjacentFlowerCount) continue
      _get8(cell).filter(c => !(c.propMark || c.explored || c.flower || c.flag))
        .forEach(next => {
          q.push(next)
          next.propMark = true
        })
    }
  }
  const _exploreCellDirect = cell => { // explore one cell, whatever it takes! (including flags)
    let safe = _exploreCellSafe(cell) // <- performs important magic!
    if (cell.flower) {
      if (!cell.explored) exploredCount++
      cell.explored = true
      _removeFlag(cell)
      cell.cell.classList.add('explored')
      cell.cell.classList.add('flower')
      cell.cell.classList.add('steppedOn')
      publicEventTarget.dispatchEvent(_.E('steppedOnFlower', { cell: { x: cell.x, y: cell.y } }))
    } else {
      _explorationPropagation(cell)
    }
    publicEventTarget.dispatchEvent(_.E('exploredCountChanged', { exploredCount }))
  }

  /* EXPORTABLE FIELD FUNCTIONS */

  const _endNow = () => {
    allCellData.forEach(cell => {
      if (!cell.explored) {
        _computeAndSetAdjacentCount(cell)
        if (cell.flower) cell.cell.classList.add('flower')
      }
    })
    eField.classList.add('ended')
    publicEventTarget.dispatchEvent(_.E('ended'))
  }

  const _fieldControlFns = {
    get endNow() { return _endNow; }
  }

  /* EVENT LISTENERS */
  const _clickHandler = (cell, simpleClick, evt=null) => {
    clickCount++
    publicEventTarget.dispatchEvent(_.E('clickCountChanged', { clickCount }))

    if (!flowersGenerated && simpleClick) // generate flowers on first (simple) click, if not done previously
      _genFlowers(flowerCount, cell)
    if (exploredCount === 0) // fire en event for the first click
      publicEventTarget.dispatchEvent(_.E('firstClicked'))
    if (cell.explored) return console.warn('cell already explored')
    if (simpleClick) { // explore!
      if (cell.flag) return console.warn('attempted simple click on flagged cell!')
      _exploreCellDirect(cell);
    } else { // flag!
      if (cell.flag) _removeFlag(cell)
      else _addFlag(cell)
    }
  }
  const _clickEventHandler = (evt, cell) => {
    if (!cell) return console.error('clicked bad cell!', {cell})
    let simpleClick =
      evt.button === 0
      && !( evt.altKey || evt.shiftKey || evt.ctrlKey )
    _clickHandler(cell, simpleClick, evt)
  }
  const _contextmenuEventHandler = (evt, cell) => {
    if (!cell) return console.error('clicked bad cell!', {cell})
    _clickHandler(cell, false, evt) // contextmenu usually fired for right click
  }

  /* ACTUALLY GENERATE STUFF */
  const _genBaseField = () => {
    let cellGlobalIdx = 0
    for (let x = 0; x < sizeX; x++) {
      let arr = cells[x] = []
      let cd = cellData[x] = []
      for (let y = 0; y < sizeY; y++) {
        let idx = cellGlobalIdx++
        let eCell = _.C('div', 'cell', { 'data-x':x, 'data-y':y }, { '--x':x+1, '--y':y+1 })
        let eContent = _.C('div', 'cellContent')
        let eButton = _.C('button', 'cellButton')
        eCell.appendChild(eContent)
        eCell.appendChild(eButton)
        allCells[idx] = arr[y] = eCell
        eField.appendChild(eCell)
        let _adjacentFlowerCount = null
        let data = {
          x, y, idx,
          flower: false,
          flag: false,
          discovered: false,
          cell: eCell,
          button: eButton,
          propMark: false,
          get adjacentComputed() { return _adjacentFlowerCount !== null },
          get adjacentFlowerCount() { return _adjacentFlowerCount },
          setCount: count => {
            _adjacentFlowerCount = count
            if (count) {
              eCell.classList.add('hasAdj')
              eCell.classList.add(`adj${count}`)
              eContent.innerText = `${count}`
            }
          },
        }
        allCellData[idx] = cd[y] = data
        eButton.addEventListener('click', e=>{
          e.preventDefault()
          e.stopPropagation()
          _clickEventHandler(e, data)
        })
        eButton.addEventListener('contextmenu', e=>{
          e.preventDefault()
          e.stopPropagation()
          _contextmenuEventHandler(e, data)
        })
      }
    }
  }

  const _genFlowers = (number, excludeCell=null) => {
    console.debug('_genFlowers called', {number, excludeCell})
    if (flowersGenerated) return console.warn('flowers were already generated previously!')
    flowersGenerated = true
    if (!number || number > cellCount) return console.warn('did not generarte any flowers!', {number, cellCount, excludeCell})
    // FIXME: this algorithm is highly inefficient ... but I don't care at this point
    let idxRemain = Array.from({ length: cellCount }, (val,idx) => idx)
    if (excludeCell) {
      if (number === cellCount)
        console.warn('we can not exclude a cell from flowering, if all cells should get flowered ):')
      else
        idxRemain.splice(excludeCell.idx, 1) // remove cell ...
    }

    let idxChosen = []
    for (let i = 0; i < flowerCount; i++) {
      let r = _.R(idxRemain.length)
      let flowerIdx
      idxChosen.push(flowerIdx = idxRemain[r])
      idxRemain.splice(r, 1)

      allCellData[flowerIdx].flower = true
    }
  }

  /* PROPERLY INITIALISE EVERYTHING HERE */
  _genBaseField()

  // enrich event target!
  const pubProps = {
    field: eField,
    data: fieldData,
    control: _fieldControlFns,
  }
  Object.assign(publicEventTarget, pubProps)

  return publicEventTarget
}

window._m = {
  generateField,
}
