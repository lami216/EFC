!define EFC_HOOK_DIR "${__FILEDIR__}"

!macro NSIS_HOOK_POSTINSTALL
  SetOutPath "$INSTDIR"
  File /oname=efc-logo-${VERSION}.ico "${EFC_HOOK_DIR}\..\icons\icon.ico"
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
  CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\efc-logo-${VERSION}.ico" 0
!macroend
