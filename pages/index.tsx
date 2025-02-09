import type { NextPage } from "next"
import { formatEther } from "@ethersproject/units"
import { Button } from "@mui/material"
import LoadingButton from "@mui/lab/LoadingButton"
import { Goerli, useEtherBalance, useEthers } from "@usedapp/core"
import { useCallback, useState } from "react"
import { isNil } from "lodash"
import Link from "next/link"
import { Alert } from "../components/Alert"
import { Item } from "../components/Item"
import { RoundedBox } from "../components/RoundedBox"
import { hasMetamask } from "../hooks/hasMetamask"
import { useWalletClassification } from "../hooks/useWalletClassification"
import { claimTokens, retrieveNonce } from "../services/HttpClient"
import { messageTemplate } from "../utils/textMessage"

const Home: NextPage = () => {
  const { account, library, isLoading: loading, activateBrowserWallet, switchNetwork, chainId } = useEthers()
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const installed = hasMetamask()
  const balance = useEtherBalance(account, { refresh: "everyBlock" })
  const [retrieveAmount] = useWalletClassification()

  const claimGorliEth = async () => {
    try {
      setError(undefined)

      if (isNil(library) || isNil(account)) {
        throw new Error("Wallet is not connected")
      }

      const nonce = await retrieveNonce()
      const message = messageTemplate(nonce)

      const signer = library.getSigner()
      const signature = await signer.signMessage(message)

      await claimTokens(account as string, message, signature)
      setSuccess(true)
    } catch (e: any) {
      setSuccess(false)

      if (e.name === "AxiosError" && e.response.data.message) {
        setError(e.response.data.message)
        return
      }

      setError(e?.message || "Something went wrong")
    }
  }

  const renderButton = useCallback(() => {
    if (!installed) {
      return (
        <Link href="https://metamask.io/download/" passHref>
          <Button variant="contained" fullWidth>
            Install MetaMask
          </Button>
        </Link>
      )
    }

    if (loading) {
      return <LoadingButton variant="contained" loading fullWidth />
    }

    if (!account) {
      return (
        <Button variant="contained" onClick={() => activateBrowserWallet()} fullWidth>
          Connect wallet
        </Button>
      )
    }

    if (chainId !== Goerli.chainId) {
      return (
        <Button variant="contained" onClick={() => switchNetwork(Goerli.chainId)} fullWidth>
          Switch to Görli network
        </Button>
      )
    }

    return (
      <Button variant="contained" onClick={claimGorliEth} fullWidth>
        Claim Görli ETH
      </Button>
    )
  }, [loading, account, chainId, installed])

  return (
    <RoundedBox>
      <Item>
        <span>Wallet balance</span>
        <span>{balance ? formatEther(balance) : <>&ndash;</>} ETH (testnet)</span>
      </Item>
      <Item>
        <span>Claimable Görli ETH</span>
        <span>{formatEther(retrieveAmount(account))} ETH (testnet)</span>
      </Item>
      {renderButton()}
      {success && !error && (
        <Alert severity="success">
          Görli ETH has been dispatched to your wallet. You should receive it within 3 minutes.
        </Alert>
      )}
      {!success && error && <Alert severity="error">{error}</Alert>}
    </RoundedBox>
  )
}

export default Home
